use std::time::{Duration, Instant};

use actix::prelude::*;
use actix_web_actors::ws;

use crate::server;

/// How often heartbeat pings are sent
const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(5);

/// How long before lack of client response causes a timeout
const CLIENT_TIMEOUT: Duration = Duration::from_secs(10);

//use json::JsonValue;
use serde::{Deserialize, Serialize};
/*const MSG_NAME_START_VIDEO: &str = "StartVideo";
const MSG_NAME_SEND_OFFER: &str ="SendOffer";
const MSG_NAME_SEND_ANSWER: &str ="SendAnswer";
const MSG_NAME_SEND_CANDIDATE: &str ="SendCandidate";*/
const JOINED_MSG_NAME: &str = "JoinedMsg";
#[derive(Debug, Serialize, Deserialize)]
struct JoinedMsg {
    name: String,
    room_no:String,
    id: u32,
}

impl JoinedMsg {
    pub fn new(room_no:String, id:u32) -> Self {
        Self {
            name: JOINED_MSG_NAME.to_string(),
            room_no,
            id,
        }
    }
}
#[derive(Debug, Serialize, Deserialize)]
struct MsgWithName {
    name: String,
    room_no:String,
    id:u32,
    msg:String
}
impl MsgWithName {
    #[allow(dead_code)]
    pub fn new(room_no:String, id:u32, name: String, msg: String) -> Self {
         Self {
             name,
             room_no,
             id,
             msg
         }
    }
}
const ERROR_MSG_NAME: &str = "ErrorMsg";
#[derive(Debug, Serialize, Deserialize)]
struct ErrorMsg {
    name: String,
    room_no:String,
    id:u32,
    msg: String,
}
impl ErrorMsg {
    pub  fn new(room_no: String, id:u32, msg:String) -> Self {
        Self {
            name: ERROR_MSG_NAME.to_string(),
            room_no,
            id,
            msg,
        }
    }
}
const ROOM_MSG_NAME: &str = "RoomMsg";
#[derive(Debug, Serialize, Deserialize)]
struct RoomMsg {
    name: String,
    room_no:String,
    from:u32,
    msg: String,
}

impl RoomMsg {
    pub fn new(room_no:String, from: u32, msg: String) -> Self {
        Self {
            name: ROOM_MSG_NAME.to_string(),
            room_no,
            from,
            msg,
        }
    }
}




#[derive(Debug)]
pub struct WsChatSession {
    /// unique session id
    pub id: u32,

    /// Client must send ping at least once per 10 seconds (CLIENT_TIMEOUT),
    /// otherwise we drop connection.
    pub hb: Instant,

    /// joined room
    pub room: String,

    /// peer name
    pub name: Option<String>,

    /// Chat server
    pub addr: Addr<server::ChatServer>,
}

impl WsChatSession {
    /// helper method that sends ping to client every 5 seconds (HEARTBEAT_INTERVAL).
    ///
    /// also this method checks heartbeats from client
    fn hb(&self, ctx: &mut ws::WebsocketContext<Self>) {
        ctx.run_interval(HEARTBEAT_INTERVAL, |act, ctx| {
            // check client heartbeats
            if Instant::now().duration_since(act.hb) > CLIENT_TIMEOUT {
                // heartbeat timed out
                println!("Websocket Client heartbeat failed, disconnecting!");

                // notify chat server
                act.addr.do_send(server::Disconnect { id: act.id });

                // stop actor
                ctx.stop();

                // don't try to send a ping
                return;
            }

            ctx.ping(b"");
        });
    }
}

impl Actor for WsChatSession {
    type Context = ws::WebsocketContext<Self>;

    /// Method is called on actor start.
    /// We register ws session with ChatServer
    fn started(&mut self, ctx: &mut Self::Context) {
        // we'll start heartbeat process on session start.
        self.hb(ctx);

        // register self in chat server. `AsyncContext::wait` register
        // future within context, but context waits until this future resolves
        // before processing any other events.
        // HttpContext::state() is instance of WsChatSessionState, state is shared
        // across all routes within application
        let addr = ctx.address();
        self.addr
            .send(server::Connect {
                addr: addr.recipient(),
            })
            .into_actor(self)
            .then(|res, act, ctx| {
                match res {
                    Ok(res) => act.id = res,
                    // something is wrong with chat server
                    _ => ctx.stop(),
                }
                fut::ready(())
            })
            .wait(ctx);
    }

    fn stopping(&mut self, _: &mut Self::Context) -> Running {
        // notify chat server
        self.addr.do_send(server::Disconnect { id: self.id });
        Running::Stop
    }
}

/// Handle messages from chat server, we simply send it to peer websocket
impl Handler<server::Message> for WsChatSession {
    type Result = ();

    fn handle(&mut self, msg: server::Message, ctx: &mut Self::Context) {
        let room_msg = RoomMsg::new(self.room.clone(), msg.1, msg.0);
        ctx.text(serde_json::to_string(&room_msg).unwrap());
    }
}

/// WebSocket message handler
impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for WsChatSession {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        let msg = match msg {
            Err(_) => {
                ctx.stop();
                return;
            }
            Ok(msg) => msg,
        };

        log::debug!("WEBSOCKET MESSAGE: {msg:?}");
        match msg {
            ws::Message::Ping(msg) => {
                self.hb = Instant::now();
                ctx.pong(&msg);
            }
            ws::Message::Pong(_) => {
                self.hb = Instant::now();
            }
            ws::Message::Text(text) => {
                let m = text.trim();
                // we check for /sss type of messages
                if m.starts_with('/') {
                    let v: Vec<&str> = m.splitn(2, ' ').collect();
                    match v[0] {
                        "/ping" => {
                            self.hb = Instant::now();
                            ctx.pong(b"");
                        }
                        "/list" => {
                            // Send ListRooms message to chat server and wait for
                            // response
                            println!("List rooms");
                            self.addr
                                .send(server::ListRooms)
                                .into_actor(self)
                                .then(|res, _, ctx| {
                                    match res {
                                        Ok(rooms) => {
                                            for room in rooms {
                                                ctx.text(room);
                                            }
                                        }
                                        _ => println!("Something is wrong"),
                                    }
                                    fut::ready(())
                                })
                                .wait(ctx)
                            // .wait(ctx) pauses all events in context,
                            // so actor wont receive any new messages until it get list
                            // of rooms back
                        }
                        "/join" => {
                            println!("join!  args:{:?}", v);
                            if v.len() == 2 {
                                self.room = v[1].to_owned();
                                self.addr.do_send(server::Join {
                                    id: self.id,
                                    name: self.room.to_string(),
                                });
                                log::info!("self id:{} room name:{:?}", self.id, self.room);
                                let joined_msg = JoinedMsg::new(self.room.to_string(), self.id);
                                ctx.text(serde_json::to_string(&joined_msg).unwrap());

                            } else {
                                let error_msg = ErrorMsg::new(self.room.clone(),
                                                              self.id,
                                                              "!!! room name is required".to_string()
                                );
                                ctx.text(serde_json::to_string(&error_msg).unwrap());
                            }
                        }
                        "/name" => {
                            if v.len() == 2 {
                                self.name = Some(v[1].to_owned());
                            } else {
                                let error_msg = ErrorMsg::new(self.room.clone(),
                                                              self.id,
                                                              "!!! name is required".to_string()
                                );
                                ctx.text(serde_json::to_string(&error_msg).unwrap());
                            }
                        }
                        _ => {
                            let error_msg = ErrorMsg::new(self.room.clone(),
                                                          self.id,
                                                          format!("!!! unknown command: {m:?}")
                            );

                            ctx.text(serde_json::to_string(&error_msg).unwrap());
                        },
                    }
                } else {
                    let msg = if let Some(ref name) = self.name {
                        format!("{name}: {m}")
                    } else {
                        m.to_owned()
                    };
                    // send message to chat server
                    self.addr.do_send(server::ClientMessage {
                        id: self.id,
                        msg,
                        room: self.room.to_string(),

                    })
                }
            }
            ws::Message::Binary(_) => println!("Unexpected binary"),
            ws::Message::Close(reason) => {
                ctx.close(reason);
                ctx.stop();
            }
            ws::Message::Continuation(_) => {
                ctx.stop();
            }
            ws::Message::Nop => (),
        }
    }
}