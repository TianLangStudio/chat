import {getIceServers, offerOptions} from "@/util/config";
export const MSG_NAME_CANDIDATE_CHANGE = 'MsgNameCandidateChange';
//sdp isMine
export const MSG_NAME_OFFER_SDP_CHANGE = 'MsgNameOfferSDPChange';
//sdp isMine
export const MSG_NAME_ANSWER_SDP_CHANGE = 'MsgNameAnswerSDPChange';
//no args
export const EVENT_NAME_SAVE_OFFER_SDP_SUCCESS = 'EventNameSaveOfferSDPSuccess';
export const EVENT_NAME_SAVE_ANSWER_SDP_SUCCESS = 'EventNameSaveAnswerSDPSuccess';
export const withPeerConnection=(chat) => {
    if(chat._peerConnCandidates) {
        return chat;
    }
    chat._peerConnCandidates = [];
    chat.getPeerConnCandidates = () => {
        return chat._peerConnCandidates;
    }
    chat.getPeerConn = () => {
        if(!chat._peerConn) {
            chat._peerConn = new RTCPeerConnection(getIceServers())
            chat._peerConn.onicecandidate = (event) => {
                if (event.candidate) {
                    chat._peerConnCandidates.push(event.candidate);
                    chat.sendCmd(MSG_NAME_CANDIDATE_CHANGE, event.candidate)
                }
            };

        }
        return chat._peerConn;
    }

    chat.createOffer = (callback) => {
        if(chat._offerSdp) {
            chat.sendCmd(MSG_NAME_OFFER_SDP_CHANGE, chat._offerSdp);
            callback && callback(chat._offerSdp);
            return;
        }
        chat.getPeerConn().createOffer(offerOptions)
            .then(sdp => {
                chat._offerSdp = sdp;
                chat.getPeerConn().setLocalDescription(sdp)
                    .then(() => {
                        chat.sendCmd(MSG_NAME_OFFER_SDP_CHANGE, sdp);
                        callback && callback(sdp);
                    });
            })
            .catch(() => console.log('createOffer fail'));
    }
    chat.createAnswer = (callback) => {
        chat.getPeerConn().createAnswer(offerOptions)
            .then(sdp => {
                chat.getPeerConn().setLocalDescription(sdp)
                    .then(() => {
                        chat.sendCmd(MSG_NAME_ANSWER_SDP_CHANGE, sdp)
                        callback && callback(sdp);
                    });
            })
            .catch((e) => console.log('createAnswer fail:', e))
    }
    //save remotely sdp
    chat.saveSdp = (sdp, callback) => {
        chat.getPeerConn().setRemoteDescription(new RTCSessionDescription(sdp))
            .then(callback);
    }

    chat.saveIceCandidate = (candidate, callback) => {
        let iceCandidate = new RTCIceCandidate(candidate);
        chat.getPeerConn().addIceCandidate(iceCandidate)
            .then(callback);
    }
    let eventbus = chat.eventbus;
    eventbus.subscribe(MSG_NAME_OFFER_SDP_CHANGE, (sdp, isMine) => {
        if(isMine) {//ignore when it's mine msg
            return;
        }
        chat.saveSdp(sdp, () => {
            console.log('save sdp success');
            eventbus.publish(EVENT_NAME_SAVE_OFFER_SDP_SUCCESS);
            chat.createAnswer();
            //再打开音视频流

            /*openLocalMedia(stream => {
                let localVideo = localVideoRef.current;
                if (localVideo) {
                    localVideo.srcObject = stream;
                    localVideo.play();
                }

                //最后创建用于 answer 的 SDP 对象
                createAnswer(sdp => {
                    console.log('创建并发送 answer')
                    sendCmd(MsgNameSendAnswer, sdp);
                });
            });*/
        });
    })
    eventbus.subscribe(MSG_NAME_ANSWER_SDP_CHANGE, (sdp, isMine) => {
        if(isMine) {//ignore when it's mine
            return;
        }
        chat.saveSdp(sdp, () => {
            eventbus.publish(EVENT_NAME_SAVE_ANSWER_SDP_SUCCESS);
        })
    })
    eventbus.subscribe(MSG_NAME_CANDIDATE_CHANGE, (candidate, isMine) => {
        if(isMine) {//ignore when it's mine
            return;
        }
        chat.saveIceCandidate(candidate, () => {
            console.log('save candidate success');
        })
    })
    return chat;
}