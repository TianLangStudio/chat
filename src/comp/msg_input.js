import * as React from 'react';
import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import MissedVideoCallIcon from '@mui/icons-material/MissedVideoCall';
import DirectionsIcon from '@mui/icons-material/Directions';
import {useCallback, useState} from "react";


export default function MsgInput(props) {
    const {onSend= (msg)=> {}, onVideo = () => {}} = props;
    const [msg, setMsg] = useState('');

    const onChange = useCallback((e) => {
        console.log(e);
        const value = e.target.value;
        setMsg(value)
        _onSend(value);
    }, [])
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
                placeholder="there put input your message"
                inputProps={{ 'aria-label': 'there put input your message' }}
                value={msg}
                onChange={onChange}
            />
            <IconButton type="button" sx={{ p: '10px' }} aria-label="send" onClick={onClick}>
                <SearchIcon />
            </IconButton>
            <Divider orientation="vertical"/>
            <IconButton type="button" sx={{ p: '10px' }} aria-label="send" onClick={onVideo}>
                <MissedVideoCallIcon />
            </IconButton>
        </Paper>
    );
}