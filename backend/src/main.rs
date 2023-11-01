//! Simple echo websocket server.
//!
//! Open `http://localhost:8080/` in browser to test.
use std::{fs::File, io::BufReader};
use std::sync::Arc;
use std::sync::atomic::{AtomicU32, Ordering};
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use actix::Addr;
use actix::Actor;
use actix_cors::Cors;
use actix_files::NamedFile;
use actix_web::{
    dev::PeerAddr, error, middleware,web, App, Error, HttpRequest, HttpResponse, HttpServer, Responder,
};
use actix_web::cookie::time::macros::time;
use url::Url;

use rustls::{Certificate, PrivateKey, ServerConfig};
use rustls_pemfile::{certs, pkcs8_private_keys};
use actix_web_actors::ws;
use crate::server::ChatServer;
use awc::Client;
use env_logger::Builder;
use log::LevelFilter;

//mod handler;
mod server;
mod session;
mod turn_server;
mod handler;

#[allow(dead_code)]
async fn index() -> impl Responder {
    NamedFile::open_async("./static/index.html").await.unwrap()
}

static CHAT_SESSION_ID_COOKIE: &str = "chat_session_id";
/// Entry point for our websocket route
async fn chat_route(
    path: web::Path<String>,
    req: HttpRequest,
    stream: web::Payload,
    srv: web::Data<Addr<server::ChatServer>>,
) -> Result<HttpResponse, Error> {
    let room_no = path.into_inner();

    let session_id = if let Some(session_id) = req.cookie(CHAT_SESSION_ID_COOKIE) {
        session_id.to_string()
    }else {
        let session_id = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos().to_string();
        session_id
    };

    log::info!("room_no:{}, session_id:{}", room_no, session_id);
    ws::start(
        session::WsChatSession {
            id: session_id,
            hb: Instant::now(),
            room: room_no,
            name: None,
            addr: srv.get_ref().clone(),
        },
        &req,
        stream,
    )
}

async fn get_count(count: web::Data<AtomicU32>) -> impl Responder {
    let current_count = count.load(Ordering::SeqCst);
    format!("Visitors: {current_count}")
}
async fn get_rooms(chat_server: web::Data<Addr<ChatServer>>) -> impl Responder {
    chat_server.send(server::ListRooms).await.map(|s|s.join(",")).unwrap_or("".to_string())
}

async fn forward(
    req: HttpRequest,
    payload: web::Payload,
    peer_addr: Option<PeerAddr>,
    url: web::Data<Url>,
    client: web::Data<Client>,
) -> Result<HttpResponse, Error> {
    let mut new_url = (**url).clone();
    new_url.set_path(req.uri().path());
    new_url.set_query(req.uri().query());
    log::info!("new_url: {}", new_url);

    let forwarded_req = client
        .request_from(new_url.as_str(), req.head())
        .no_decompress();


    // TODO: This forwarded implementation is incomplete as it only handles the unofficial
    // X-Forwarded-For header but not the official Forwarded one.
    let forwarded_req = match peer_addr {
        Some(PeerAddr(addr)) => {
            forwarded_req.insert_header(("x-forwarded-for", addr.ip().to_string()))
        }
        None => forwarded_req,
    };

    let res = forwarded_req
        .send_stream(payload)
        .await
        .map_err(error::ErrorInternalServerError)?;

    let mut client_resp = HttpResponse::build(res.status());
    // Remove `Connection` as per
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Connection#Directives
    for (header_name, header_value) in res.headers().iter().filter(|(h, _)| *h != "connection") {
        client_resp.insert_header((header_name.clone(), header_value.clone()));
    }

    Ok(client_resp.streaming(res))
}
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let mut log_builder = Builder::new();
    log_builder
        .filter(None, LevelFilter::Off)
        //.filter(Some("rustls::conn"), LevelFilter::Off)
        .filter(Some("chat_backend"), LevelFilter::Info)
        .init();
    log::debug!("debug log enabled");
    log::info!("info log enabled");
    log::warn!("warn log enabled");
    log::error!("error log enabled");
   // env_logger::init_from_env(env_logger::Env::new().default_filter_or("Info"));
   /* actix_web::rt::spawn(async {
        turn_server::start("192.168.0.179", "3478", "user=pass", "192.168.0.179:8433").await
    });*/
    let config = load_rustls_config();

    log::info!("starting HTTPS server at https://localhost:8443");
    // start chat server actor
    let visitor_count = Arc::new(AtomicU32::new(1));
    let server = server::ChatServer::new(visitor_count.clone()).start();
    let forward_url = format!("http://localhost:3000");
    let forward_url = Url::parse(&forward_url).unwrap();
    HttpServer::new(move || {
        let cors = Cors::permissive();
           /*Cors::default().allowed_origin("https://www.rust-lang.org")
            .allowed_origin_fn(|origin, _req_head| {
                origin.as_bytes().ends_with(b".rust-lang.org")
            })
            .allowed_methods(vec!["GET", "POST"])
            .allowed_headers(vec![http::header::AUTHORIZATION, http::header::ACCEPT])
            .allowed_header(http::header::CONTENT_TYPE)
            .max_age(3600);*/

        App::new()
             .wrap(cors)
            .app_data(web::Data::new(Client::default()))
            .app_data(web::Data::new(forward_url.clone()))
            .app_data(web::Data::new(visitor_count.clone()))
            .app_data(web::Data::new(server.clone()))
            .route("/chat/count", web::get().to(get_count))
            .route("/chat/list/room", web::get().to(get_rooms))
            .route("/chat/ws/room/{room_no}", web::get().to(chat_route))
            // WebSocket UI HTML file
           // .service(web::resource("/").to(index))
            .default_service(web::to(forward))

             //enable logger
           .wrap(middleware::Logger::default())
    })
    .workers(2)
     .bind_rustls("0.0.0.0:8443", config)?
    .run()
    .await
}
fn load_rustls_config() -> rustls::ServerConfig {
    // init server config builder with safe defaults
    let config = ServerConfig::builder()
        .with_safe_defaults()
        .with_no_client_auth();

    // load TLS key/cert files
    let cert_file = &mut BufReader::new(File::open("cert.pem").unwrap());
    let key_file = &mut BufReader::new(File::open("key.pem").unwrap());

    // convert files to key/cert objects
    let cert_chain = certs(cert_file)
        .unwrap()
        .into_iter()
        .map(Certificate)
        .collect();
    let mut keys: Vec<PrivateKey> = pkcs8_private_keys(key_file)
        .unwrap()
        .into_iter()
        .map(PrivateKey)
        .collect();

    // exit if no keys could be parsed
    if keys.is_empty() {
        eprintln!("Could not locate PKCS 8 private keys.");
        std::process::exit(1);
    }

    config.with_single_cert(cert_chain, keys.remove(0)).unwrap()
}