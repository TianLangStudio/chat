import {Button, Card, CardActions, CardContent, CardMedia, Typography} from "@mui/material";
import {useCallback} from "react";
import {createFileTransfer} from "@/util/file_transfer";

const SendFileReqMsg = (props) => {
    const {
        path,
        name,
        size,
        dsp,
        candidates,
        chat,
        isMine = false,
    } = props;
    const onReceiveFile = useCallback(() => {
        const fileTransfer = createFileTransfer(chat);
        fileTransfer.receiveFileReq(dsp, candidates, path, name, size)
    }, []);
    return ( <Card sx={{ maxWidth: 345 }}>
        <CardContent>
            <Typography gutterBottom variant="h5" component="div">
                {name} {size}
            </Typography>
            <Typography variant="body2" color="text.secondary">
                {isMine?'File send request has been sent':'Receive the file or not?'}
            </Typography>
        </CardContent>
        {!isMine && <CardActions>
            <Button size="small" onClick={onReceiveFile}>Yes</Button>
            <Button size="small">No</Button>
        </CardActions>}
    </Card>)

}
export default SendFileReqMsg;
export const createSendFileReqMsg = (msgInfo) => {
     let body = msgInfo.body || {};
     let render = () => <SendFileReqMsg
        path={body.path}
        name={body.name}
        size={body.size}
        dsp = {body.dsp}
        candidates = {body.candidates}
        chat = {msgInfo.chat}
        isMine = {msgInfo.isMine}
    />;
     return {... msgInfo, render}

}