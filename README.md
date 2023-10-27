# Chat 
A chat room developed with Rust, React, webrtc, websocket, actix-web and so on.
![rust chat](./doc/img/rust_chat.png)
## How to Run

First, run the development server of front-end:

```bash
npm install
npm run dev
``` 
and then run the development server of back-end:

```bash 
cd backend
cargo watch -w src -x run 
# or without hot load
cargo run 
``` 
open [https://127.0.0.1:8443/room/0001](https://127.0.0.1:8443/room/0001) in the browser