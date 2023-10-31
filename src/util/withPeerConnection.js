import {getIceServers, offerOptions} from "@/util/config";
export const MSG_NAME_CANDIDATE_CHANGE = 'MsgNameCandidateChange';
export const MSG_NAME_OFFER_SDP_CHANGE = 'MsgNameOfferSDPChange';
export const MSG_NAME_ANSWER_SDP_CHANGE = 'MsgNameAnswerSDPChange';
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
                    //chat.eventbus.publish(MSG_NAME_CANDIDATE_CHANGE, chat._peerConnCandidates)
                }
            };
        }
        return chat._peerConn;
    }

    chat.createOffer = (callback) => {
        if(chat._offerSdp) {
            //chat.eventbus.publish(MSG_NAME_OFFER_SDP_CHANGE, chat._offerSdp);
            callback(chat._offerSdp);
            return;
        }
        chat.getPeerConn().createOffer(offerOptions)
            .then(sdp => {
                chat._offerSdp = sdp;
                chat.getPeerConn().setLocalDescription(sdp)
                    .then(() => {
                        //chat.eventbus.publish(MSG_NAME_OFFER_SDP_CHANGE, sdp);
                        callback(sdp);
                    });
            })
            .catch(() => console.log('createOffer fail'));
    }
    chat.createAnswer = (callback) => {
        chat.getPeerConn().createAnswer(offerOptions)
            .then(sdp => {
                chat.setLocalDescription(sdp)
                    .then(() => {
                        //chat.eventbus.publish(MSG_NAME_ANSWER_SDP_CHANGE, sdp)
                        callback(sdp);
                    });
            })
            .catch(() => console.log('createAnswer fail'))
    }
    return chat;
}