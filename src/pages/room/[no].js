import { useRouter } from 'next/router'
import Box from "@mui/material/Box";
import ChatRoom from "@/comp/chat_room";
export default  function Room() {
    const route = useRouter();
    const {no} = route.query;
    return (<ChatRoom roomNo={no}/>)
}