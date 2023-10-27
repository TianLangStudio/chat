'use client'
import Box from "@mui/material/Box";
import Link from "next/link";
import {Button, Drawer, Typography} from "@mui/material";
import MsgInput from "@/comp/msg_input";
import {useEffect, useMemo, useRef, useState} from "react";
import {
    bindOnIceCandidate,
    bindOnTrack, createAnswer,
    createOffer,
    createPeerConnection,
    openLocalMedia, saveIceCandidate,
    saveSdp
} from "@/util/webrtc_util";
import {useFiles} from "@/hooks/useFiles";
import {withPeerConnection} from "@/util/withPeerConnection";
import {FileTransfer} from "@/util/file_transfer";
import Chat, {EVENT_ROOM_MSG} from "@/util/chat";
import {isJson} from "@/util/str_util";

let socket;
let chat;
let fileTransfer;
function connect(roomNo, setConnStatus, onMessage) {
    if(typeof window !== 'undefined') {
        disconnect(setConnStatus)
        const { location } = window
        const proto = location.protocol.startsWith('https') ? 'wss' : 'ws'
        const wsUri = `${proto}://${location.host}/chat/ws/room/` + roomNo;
        socket = new WebSocket(wsUri)
    }
    socket.onopen = () => {
        setConnStatus(true);
        socket.send("/join " + roomNo);
    }

    socket.onmessage = (ev) => {
        onMessage(ev)
    }

    socket.onclose = () => {
        socket = null
        setConnStatus(false);
    }
}

function disconnect(setConnStatus) {
    if (socket) {

        socket.close()
        socket = null
        setConnStatus(false);
    }
}

function sendCmd(name, body) {
    let msg = {
        name: name,
        body: body || '',
    }
    socket.send(JSON.stringify(msg))
}
let sessionId = 0;
const MsgNameStartVideo = "StartVideo";
const MsgNameSendOffer ="SendOffer";
const MsgNameSendAnswer="SendAnswer";
const MsgNameSendCandidate="SendCandidate";
const ChatRoom = (props) => {
    const {roomNo} = props;
    const [connStatus, setConnStatus] = useState(false);
    const [msgs, setMsgs] = useState([]);
    const [showVideo, setShowVideo] = useState(false);
    const localVideoRef = useRef();
    const remoteVideoRef = useRef();
    const [onSelectedFile, onRemoveFile, findFileByPath] = useFiles();
    function onVideo() {
        setShowVideo(true);
        sendCmd(MsgNameStartVideo);
    }
    function onFile(e) {
        let file_info = onSelectedFile(e);
        console.log('file_info:', file_info);
    }
    useEffect(() => {
        console.log('rooNO:', roomNo, ' chat:', chat)
        if(roomNo && !chat) {
            chat = withPeerConnection(new Chat(roomNo));
            fileTransfer = new FileTransfer(chat);
            chat.connect();
            let eventbus = chat.eventbus;
            eventbus.subscribe(EVENT_ROOM_MSG, (content, isMine, from) => {
                if(!isJson(content)) {
                    let id = new Date().getTime() + '';
                    setMsgs((pre) => pre.concat([{from, content, id}]))
                }
            })
        }
        /*connect(roomNo, setConnStatus, (msgEvt) => {
            let data = msgEvt.data;
            try {
                let msg = JSON.parse(data);
                let name = msg.name;
                switch (name) {
                    case 'JoinedMsg':
                        sessionId = msg.id;
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
                           msgValue = msgNameAndValue.body;
                        }catch (e) {
                            console.log('not json:', e);
                        }

                        let isMineMsg = msgFrom == sessionId;
                        console.log('msgFrom:', msgFrom, 'sessionId:', sessionId, 'isMineMsg:', isMineMsg)
                        console.log('name:', msgName, 'value:', msgValue);

                        switch (msgName) {
                            case MsgNameStartVideo:
                                setShowVideo(true);
                                // 1、创建端点
                                createPeerConnection();
                                // 2、绑定 收集 candidate 的回调
                                bindOnIceCandidate(candidate => sendCmd(MsgNameSendCandidate, candidate));
                                // 3、绑定 获得 远程视频流 的回调
                                bindOnTrack(stream => {
                                    console.log('获得远程视频流');
                                    //显示 远程视频流
                                    let remoteVideo = remoteVideoRef.current;
                                    if(remoteVideo) {
                                        remoteVideo.srcObject = stream;
                                        remoteVideo.play();
                                    }
                                });
                                // 先打开视频流, 在创建用于 offer 的 SDP 对象
                                openLocalMedia(stream => {
                                    // 显示本地视频流
                                    let localVideo = localVideoRef.current;
                                    if(localVideo) {
                                        localVideo.srcObject = stream;
                                        localVideo.play();
                                    }
                                    isMineMsg && createOffer(sdp => {
                                        console.log('创建并发送 offer')
                                        sendCmd(MsgNameSendOffer, sdp);
                                    });
                                });

                                break;
                            case MsgNameSendOffer:

                                //先保存收到的 offer
                                sessionId != msgFrom && saveSdp(msgValue, () => {
                                    console.log('offer 保存成功');

                                    //再打开音视频流
                                    openLocalMedia(stream => {
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
                                    });
                                });
                                break;
                            case MsgNameSendAnswer:
                                // 保存收到的 answer
                                msgFrom != sessionId && saveSdp(msgValue, () => console.log('answer 保存成功'));
                                break;
                            case MsgNameSendCandidate:
                                //用于交换 candidate
                                msgFrom != sessionId && saveIceCandidate(msgValue);
                                break;
                            default:
                                setMsgs((prevState) => {
                                    return prevState.concat([{from:msgFrom, msg: msgContent, id: new Date().getTime() + ''}]);
                                })
                                break;
                        }
                        break;
                    case 'ErrorMsg':
                        setMsgs((prevState) => {
                            return prevState.concat([{from:msg.from, msg: msg.msg, id: new Date().getTime() + ''}]);
                        })
                        break;
                    case 'ErrorMsg':
                        console.error('error:', msg);
                        break;

                }
            }catch (e) {
                console.error('err:', e);
                console.log('msgEvt', msgEvt);
            }

        })*/
    }, [roomNo])
    function onSend(msg) {
        chat.sendMsg(msg);
        return true;
    }

    return (<Box
        sx={{
            display: 'flex',
            alignItems: 'stretch',
            justifyContent:'stretch',
            flexDirection: 'column',
            p: 1,
            m: 1,
            borderRadius: 1,
            height:'100%',

        }}
    >
        <Drawer
            anchor="left"
            open={showVideo}
            sx={{
                width: "500px",
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: "500px",
                    opacity: 0.5
                },
            }}
            variant="persistent"
        >
          <video ref={localVideoRef} width="500px" height="300px" autoPlay></video>
        </Drawer>
        <Drawer
            anchor="right"
            open={showVideo}
            sx={{
                width: "500px",
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: "500px",
                    opacity: 0.5
                },
            }}
            variant="persistent"
        >
            <video ref={remoteVideoRef} width="500px" height="300px" autoPlay></video>

        </Drawer>
        <Box sx={{
            mb: 3,
            alignSelf: 'center',
            justifySelf:'center',
        }}>
            Room No. {roomNo}
        </Box>
        <Box sx={{
            display:'flex',
            alignItems: 'flex-start',
            justifyContent:'flex-start',
            flexDirection: 'column',
            mx: 3,
            my:3,
            flexGrow: 1,
            width:'100%',
        }}>
            {msgs.map((msg) => {
                return (<Box key={msg.id} sx={{
                    maxWidth:'80%',
                    alignSelf: msg.from === sessionId?'flex-end':'flex-start',
                    justifySelf: msg.from === sessionId?'flex-end':'flex-start',
                    mx:3,
                    my:1,
                }}>
                    <Typography>
                        {msg.content}
                    </Typography>
                </Box>)
            })}
        </Box>
        <Box sx={{
            my: 3,
            alignSelf: 'center',
            justifySelf:'center',
        }}>
            <MsgInput onSend={onSend} onVideo={onVideo} onFile={onFile}></MsgInput>
        </Box>
    </Box>);
}
export default ChatRoom;