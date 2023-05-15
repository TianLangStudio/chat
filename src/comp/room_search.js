import * as React from 'react';
import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import DirectionsIcon from '@mui/icons-material/Directions';
import {useCallback, useState} from "react";


export default function RoomSearch(props) {
    const {onSearch = (search)=> {}} = props;
    const [searchText,setSearchText] = useState('');

    const onChange = useCallback((e) => {
        console.log(e);
        const value = e.target.value;
        setSearchText(value);
        _onSearch(value);
    }, [])
    function _onSearch(searchText) {
        onSearch(searchText.trim());
    }
    function onClick() {
        _onSearch(searchText);
    }
    return (
        <Paper
            component="form"
            sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', width: 400 }}
        >
            <InputBase
                sx={{ ml: 1, flex: 1 }}
                placeholder="search by room No."
                inputProps={{ 'aria-label': 'search by room No.' }}
                value={searchText}
                onChange={onChange}
            />
            <IconButton type="button" sx={{ p: '10px' }} aria-label="search" onClick={onClick}>
                <SearchIcon />
            </IconButton>
        </Paper>
    );
}