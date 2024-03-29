import * as React from 'react';
import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import MissedVideoCallIcon from '@mui/icons-material/MissedVideoCall';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import {useCallback, useState} from "react";


export default function MsgInput(props) {
    const {
        onSend= (msg)=> {},
        onVideo = () => {},
        onFile = () => {},
        disabled = false,
    } = props;
    const [msg, setMsg] = useState('');

    const onChange = useCallback((e) => {
        const value = e.target.value;
        setMsg(value);
    }, [])
    const keyDownHandler = useCallback((e) => {
        if(e.keyCode === 13) {
            _onSend(msg);
        }
    }, [msg]);
    function _onSend(msg) {
        if(msg.length > 0 && onSend(msg)) {
            setMsg('');
        }
    }
    function onClick() {
        _onSend(msg)
    }

    return (
        <Paper
            component="div"
            sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', width: 400 }}
        >
            <InputBase
                sx={{ ml: 1, flex: 1 }}
                placeholder="Type your message here!"
                inputProps={{
                    'aria-label': 'there put input your message'
                }}
                disabled={disabled}
                value={msg}
                onChange={onChange}
                onKeyDown = {keyDownHandler}
            />
            <IconButton type="button" sx={{ p: '10px' }} aria-label="send" disabled={disabled} onClick={onClick}>
                <SendOutlinedIcon />
            </IconButton>
            <Divider orientation="vertical"/>
            <IconButton type="button" sx={{ p: '10px' }} aria-label="video" disabled={disabled} onClick={onVideo}>
                <MissedVideoCallIcon />
            </IconButton>
            <IconButton component="label" variant="contained" sx={{p: '10px'}} disabled={disabled} aria-label="file">
                <NoteAddOutlinedIcon/>
                <input
                    type="file"
                    hidden
                    disabled={disabled}
                    onChange={onFile}
                />
            </IconButton>
        </Paper>
    );
}