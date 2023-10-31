import Eventbus from "@/util/eventbus";
import eventbus from "@/util/eventbus";
const roomBaseUrl = 'chat/ws/room';
//args is_connected:bool
export const EVENT_CONN_STATUS_CHANGE = "EVENT_CONN_STATUS_CHANGE";
//args msgContent, isMineMsg, msgFrom
export const EVENT_ROOM_MSG = "RoomMsg";
class Chat{
    constructor(roomNo) {
        this.roomNo = roomNo;
        this.sessionId = 0;
        this.eventbus = new Eventbus();
    }
    connect() {
        const { location } = window
        const proto = location.protocol.startsWith('https') ? 'wss' : 'ws'
        const wsUri = `${proto}://${location.host}/${roomBaseUrl}/` + this.roomNo;
        this.socket = new WebSocket(wsUri);
        this.registerSocketEvent();
    }
    sendMsg(msg) {
        if(this.socket.readyState === this.socket.OPEN) {
            this.eventbus.publish(EVENT_CONN_STATUS_CHANGE, true);
            this.socket.send(msg);
        } else {
            this.eventbus.publish(EVENT_CONN_STATUS_CHANGE, false);
            setTimeout(() => {this.sendMsg(msg)}, 500)
        }
    }
    sendCmd(name, payload) {
        let msg = {
            name: name,
            body: payload || '',
            from: this.sessionId,
        };
        console.log("msg:", msg);
        this.sendMsg(JSON.stringify(msg));
    }

    registerSocketEvent() {
        this.socket.onopen = () => {
            this.eventbus.publish(EVENT_CONN_STATUS_CHANGE, false);
            //this.socket.send("/join " + this.roomNo);
            console.log("onopen this:", this);
            this.roomNo && this.sendMsg('/join ' + this.roomNo);
        }

        this.socket.onmessage = (ev) => {
            this.messageHandler(ev);
        }

        this.socket.onclose = () => {
            this.socket = null;
            this.eventbus.publish(EVENT_CONN_STATUS_CHANGE, false);
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
                    console.log('JoinedMsg:', msg);
                    this._ping();
                    this.eventbus.publish(EVENT_CONN_STATUS_CHANGE, true);
                    break;
                case 'RoomMsg':
                    let msgContent = msg.msg;
                    let msgFrom = msg.from;
                    /*let msgName = '';
                    let msgValue = '';
                    try {
                        let msgNameAndValue = JSON.parse(msgContent);
                        msgName = msgNameAndValue.name;
                        msgValue = msgNameAndValue.payload;
                    }catch (e) {
                        console.warn('not json:' + msgContent, e);
                    }*/
                    let isMineMsg = msgFrom === this.sessionId;
                    console.log('msgFrom:', msgFrom, 'sessionId:', this.sessionId, 'isMineMsg:', isMineMsg)
                    console.log('eventbus publish EVENT_ROOM_MSG, msgContent, isMineMsg, msgFrom:',
                        EVENT_ROOM_MSG, msgContent, isMineMsg, msgFrom )
                    this.eventbus.publish(EVENT_ROOM_MSG, msgContent, isMineMsg, msgFrom)
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
    _ping() {
        this.sendMsg(`/ping ${this.sessionId}`);
        //this.socket.ping();
        setTimeout(() => {
            this._ping();
        }, 3000);
    }
}

export default Chat;