
// File Transfer
import {withPeerConnection} from "@/util/withPeerConnection";
export const MSG_NAME_SEND_FILE_REQ = 'MsgNameSendFileReq';
export const MSG_NAME_RECEIVE_FILE = 'MsgNameReceiveFile';
export const MSG_NAME_REJECT_FILE = 'MsgNameRejectFile';

export class FileTransfer {
    constructor(chat) {
        this.chat = withPeerConnection(chat);
    }
    //send file
    sendFileReq(path, name, size, contents) {
        const chat = this.chat;
        chat.eventbus.subscribeOnce(`${MSG_NAME_RECEIVE_FILE}.${path}`, (msgValue) => {
            const payload = JSON.parse(msgValue);
            chat.getPeerConn().setRemoteDescription(payload.sdp)
                .then(() => {
                    console.log('setRemoteDescription success');
                    this._createSendChannel(`File.${path}`, contents)
                })
                .catch((e) => {console.warn('setRemoteDescription error', e);})
        })
        chat.createOffer((dsp) => {
            const candidates = chat.getPeerConnCandidates()
            chat.sendCmd(MSG_NAME_SEND_FILE_REQ, {
                path,
                name,
                size,
                dsp,
                candidates,
            })
        })
    }

    _createSendChannel(channelName, contents) {
        const chat = this.chat;
        this.channels = this.channels || {};
        const channel = chat.getPeerConn().createDataChannel(channelName);
        this.channels[channelName] = channel;

        channel.binaryType = "arraybuffer";
        channel.addEventListener("open", () => {
            let offset = 0;
            const contentLen = contents.byteLength;
            while (offset < contentLen) {
                console.log(`send progress: ${offset}`);
                const sliceContents = contents.slice(
                    offset,
                    offset + 16384
                );
                channel.send(sliceContents);
                offset += sliceContents.byteLength;
            }
        });
        channel.addEventListener("close", () =>{
            this.channels[channelName] = undefined
        });
        channel.addEventListener("error", (error) =>
            console.error("Error in sendChannel:", error)
        );
    }
    //receive file

    _createAnswer(remoteDsp, candidates, callback) {
        const chat = this.chat;
        if(!chat._answerSdp) {
            const conn = chat.getPeerConn();
            candidates = candidates || [];
            candidates.forEach((candidate) => {
                const iceCandidate = new RTCIceCandidate(candidate);
                conn.addIceCandidate(iceCandidate)
                    .then(() => console.log('addIceCandidate success'))
                    .catch((e) => console.log('add IceCandidate error', e));
            })
            conn.setRemoteDescription(remoteDsp).then(() => {
                conn.createAnswer().then((dsp) => {
                    chat._answerSdp = dsp;
                    conn.setLocalDescription(dsp).then(() => {
                        callback(dsp);
                    }).catch((e) => {
                        console.error("setLocalDescription error:", e)
                    })
                })
            }).catch((e) => {
                console.error("setRemoteDescription error:", e)
            })

        }else {
            callback(chat._answerSdp)
        }
    }

    receiveFileReq(remoteDsp, candidates, filePath, fileName, fileSize)  {
        const conn = this.chat.getPeerConn();
        this._createAnswer(remoteDsp, candidates, function (sdp) {
            conn.addEventListener("datachannel", (event) =>{
                const receiveChannel = event.channel;
                receiveChannel.binaryType = "arraybuffer";
                const receiveBuffer = new Uint8Array(fileSize);
                const receivedSize = 0;
                receiveChannel.onmessage = (event) => {
                    receiveBuffer.set(new Uint8Array(event.data), receivedSize);
                    this.receivedSize += event.data.byteLength;
                    console.log(`Received progress: ${receivedSize}`);
                    if (receivedSize === fileSize) {
                        //TODO download file and close channel
                    }
                };
                receiveChannel.onopen = () =>
                    console.log(`channel readyState: ${receiveChannel.readyState}`);
                receiveChannel.onclose = () =>
                    console.log(`channel readyState: ${receiveChannel.readyState}`);
            });
            this.chat.sendCmd(`${MSG_NAME_RECEIVE_FILE}.${filePath}`, {
                sdp
            })
        })
    }
}

export function createFileTransfer(chat) {
    if(!chat._fileTransfer) {
        chat._fileTransfer = new FileTransfer(chat);
    }
    return chat._fileTransfer;
}