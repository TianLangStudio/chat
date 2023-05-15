//! Simple echo websocket server.
//!
//! Open `http://localhost:8080/` in browser to test.
use std::{fs::File, io::BufReader};
use actix_files::NamedFile;
use actix_web::{
    middleware, rt, web, App, Error, HttpRequest, HttpResponse, HttpServer, Responder,
};
use rustls::{Certificate, PrivateKey, ServerConfig};
use rustls_pemfile::{certs, pkcs8_private_keys};
mod handler;

async fn index() -> impl Responder {
    NamedFile::open_async("./static/index.html").await.unwrap()
}

/// Handshake and start WebSocket handler with heartbeats.
async fn echo_heartbeat_ws(req: HttpRequest, stream: web::Payload) -> Result<HttpResponse, Error> {
    let (res, session, msg_stream) = actix_ws::handle(&req, stream)?;

    // spawn websocket handler (and don't await it) so that the response is returned immediately
    rt::spawn(handler::echo_heartbeat_ws(session, msg_stream));

    Ok(res)
}

/// Handshake and start basic WebSocket handler.
///
/// This example is just for demonstration of simplicity. In reality, you likely want to include
/// some handling of heartbeats for connection health tracking to free up server resources when
/// connections die or network issues arise.
async fn echo_ws(req: HttpRequest, stream: web::Payload) -> Result<HttpResponse, Error> {
    let (res, session, msg_stream) = actix_ws::handle(&req, stream)?;

    // spawn websocket handler (and don't await it) so that the response is returned immediately
    rt::spawn(handler::echo_ws(session, msg_stream));

    Ok(res)
}

// note that the `actix` based WebSocket handling would NOT work under `tokio::main`
#[tokio::main(flavor = "current_thread")]
async fn main() -> std::io::Result<()> {
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));
    let config = load_rustls_config();

    log::info!("starting HTTPS server at https://localhost:8443");

    HttpServer::new(|| {
        App::new()
            // WebSocket UI HTML file
            .service(web::resource("/").to(index))
            // websocket routes
            .service(web::resource("/ws").route(web::get().to(echo_heartbeat_ws)))
            .service(web::resource("/ws-basic").route(web::get().to(echo_ws)))
            // enable logger
            .wrap(middleware::Logger::default())
    })
    .workers(2)
     .bind_rustls("127.0.0.1:8443", config)?
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