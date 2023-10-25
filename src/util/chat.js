import {
    bindOnIceCandidate,
    bindOnTrack, createAnswer,
    createOffer,
    createPeerConnection,
    openLocalMedia, saveIceCandidate,
    saveSdp
} from "@/util/webrtc_util";
import {getIceServers, offerOptions} from "@/util/config";
import {console} from "next/dist/compiled/@edge-runtime/primitives/console";

const MsgNameStartVideo = "StartVideo";
const MsgNameSendOffer ="SendOffer";
const MsgNameSendAnswer="SendAnswer";
const MsgNameSendCandidate="SendCandidate";
const roomBaseUrl = 'chat/ws/room';
class Chat{
    constructor(roomNo) {
        const { location } = window
        const proto = location.protocol.startsWith('https') ? 'wss' : 'ws'
        const wsUri = `${proto}://${location.host}/${roomBaseUrl}/` + roomNo;
        this.socket = new WebSocket(wsUri);
        this.roomNo = roomNo;
        this.sessionId = 0;
        this.registerSocketEvent();
        this.eventbus = new Eventbus();
    }
    sendCmd(name, payload) {
        let msg = {
            name: name,
            body: payload || '',
            from: this.sessionId,
        }
        this.socket.send(JSON.stringify(msg))
    }

    registerSocketEvent() {
        this.socket.onopen = () => {
            this.onConnStatusChange(true);
            this.socket.send("/join " + this.roomNo);
        }

        this.socket.onmessage = (ev) => {
            this.messageHandler(ev);
        }

        this.socket.onclose = () => {
            this.socket = null;
            this.onConnStatusChange(false)
        }
    }
    messageHandler(msgEvt) {
        const data = msgEvt.data;
        try {
            let msg = JSON.parse(data);
            let name = msg.name;
            switch (name) {
                case 'JoinedMsg':
                    this.sessionId = msg.id;
                    console.log('sessionId', msg.id);
                    break;
                case 'RoomMsg':
                    let msgContent = msg.msg;
                    let msgFrom = msg.from;
                    let msgName = '';
                    let msgValue = '';
                    try {
                        let msgNameAndValue = JSON.parse(msgContent);
                        msgName = msgNameAndValue.name;
                        msgValue = msgNameAndValue.payload;
                    }catch (e) {
                        console.warn('not json:' + msgContent, e);
                    }
                    let isMineMsg = msgFrom == this.sessionId;
                    console.log('msgFrom:', msgFrom, 'sessionId:', this.sessionId, 'isMineMsg:', isMineMsg)
                    console.log('name:', msgName, 'value:', msgValue);
                    this.eventbus.publish(msgName, msgValue, isMineMsg, msgFrom)
                    //{from:msgFrom, msg: msgContent, id: new Date().getTime() + ''}
                    break;
                case 'ErrorMsg':
                    console.error('error:', msg);
                    break;
            }
        }catch (e) {
            console.error('err:', e);
            console.log('msgEvt', msgEvt);
        }
    }
    onShowMessage(msg) {

    }
    onConnStatusChange(isConn) {

    }
}

export default Chat;