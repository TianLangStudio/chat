use turn::auth::*;
use turn::relay::relay_static::*;
use turn::server::{config::*, *};
use turn::Error;

use std::collections::HashMap;
use std::net::{IpAddr, SocketAddr};
use std::str::FromStr;
use std::sync::Arc;
use tokio::net::UdpSocket;
use tokio::signal;
use tokio::time::Duration;
use webrtc_util::vnet::net::*;

struct MyAuthHandler {
    cred_map: HashMap<String, Vec<u8>>,
}

impl MyAuthHandler {
    fn new(cred_map: HashMap<String, Vec<u8>>) -> Self {
        MyAuthHandler { cred_map }
    }
}

impl AuthHandler for MyAuthHandler {
    fn auth_handle(
        &self,
        username: &str,
        _realm: &str,
        _src_addr: SocketAddr,
    ) -> Result<Vec<u8>, Error> {
        if let Some(pw) = self.cred_map.get(username) {
            //log::debug!("username={}, password={:?}", username, pw);
            Ok(pw.to_vec())
        } else {
            Err(Error::ErrFakeErr)
        }
    }
}

// RUST_LOG=trace cargo run --color=always --package turn --example turn_server_udp -- --public-ip 0.0.0.0 --users user=pass

pub async fn start(public_ip: &str, port: &str, users: &str, realm: &str) -> Result<(), Error> {


    // Cache -users flag for easy lookup later
    // If passwords are stored they should be saved to your DB hashed using turn.GenerateAuthKey
    let creds: Vec<&str> = users.split(',').collect();
    let mut cred_map = HashMap::new();
    for user in creds {
        let cred: Vec<&str> = user.splitn(2, '=').collect();
        let key = generate_auth_key(cred[0], realm, cred[1]);
        cred_map.insert(cred[0].to_owned(), key);
    }

    // Create a UDP listener to pass into pion/turn
    // turn itself doesn't allocate any UDP sockets, but lets the user pass them in
    // this allows us to add logging, storage or modify inbound/outbound traffic
    let conn = Arc::new(UdpSocket::bind(format!("0.0.0.0:{port}")).await?);
    println!("listening {}...", conn.local_addr()?);

    let server = Server::new(ServerConfig {
        conn_configs: vec![ConnConfig {
            conn,
            relay_addr_generator: Box::new(RelayAddressGeneratorStatic {
                relay_address: IpAddr::from_str(public_ip)?,
                address: "0.0.0.0".to_owned(),
                net: Arc::new(Net::new(None)),
            }),
        }],
        realm: realm.to_owned(),
        auth_handler: Arc::new(MyAuthHandler::new(cred_map)),
        channel_bind_timeout: Duration::from_secs(0),
    })
        .await?;

    println!("Waiting for Ctrl-C...");
    signal::ctrl_c().await.expect("failed to listen for event");
    println!("\nClosing connection now...");
    server.close().await?;

    Ok(())
}