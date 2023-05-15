import Box from "@mui/material/Box";
import RoomSearch from "@/comp/room_search";
import {useState} from "react";
import {Button} from "@mui/material";
import Link from "next/link";

const RoomList = () => {
    const data = [{no:'0001', online:1}];
    const [rooms, setRooms] = useState(data);
    function searchRoom(searchText) {
        const searchedRooms = data.filter((r) => searchText.length == 0 || r.no.startsWith(searchText));
        setRooms(searchedRooms);
    }
    function createRoomAndJoin() {
        data.push({no:'0002', online: 0})
        searchRoom('');
    }
    return (
        <Box
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
            <Box sx={{
                mb: 3,
                alignSelf: 'center',
                justifySelf:'center',
            }}>
                <RoomSearch onSearch={searchRoom}></RoomSearch>
            </Box>
            <Box sx={{
                display:'flex',
                direction:'row',
                flexGrow:1,
                alignSelf:'center',
                alignContent: 'space-between',
                justifyContent: 'space-around',
                px:3,
                width:'100%',
            }}>
                {rooms.map((r) => {
                  return (<Link key={r.no} href={`/room/${r.no}`}>{r.no}</Link>);
                })}
            </Box>
            <Box sx={{
                my: 3,
                alignSelf: 'center',
                justifySelf:'center',
            }}>
                <Button variant="outlined" onClick={createRoomAndJoin}>Create a room and Join</Button>
            </Box>
        </Box>
    )
}

export default RoomList;
