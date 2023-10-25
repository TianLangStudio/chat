import {Button, Card, CardActions, CardContent, CardMedia, Typography} from "@mui/material";
import {useCallback} from "react";
import {createFileTransfer} from "@/util/file_transfer";

const SendFileReq = (props) => {
    const {
        path,
        name,
        size,
        dsp,
        candidates,
        chat,
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
                Receive the file or not?
            </Typography>
        </CardContent>
        <CardActions>
            <Button size="small" onClick={onReceiveFile}>Yes</Button>
            <Button size="small">No</Button>
        </CardActions>
    </Card>)

}
export default SendFileReq;