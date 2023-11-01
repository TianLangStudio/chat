import {useCallback, useState} from "react";

const useMsgs = () => {
    const [msgs, setMsgs] = useState([]);
    const addMsg = useCallback((msg) => {
        if(!msg.id) {
            console.warn('not found id of msg:', msg);
            msg.id = new Date().getTime() + '';
        }
        setMsgs((msgs) => {
            let newMsgs = msgs.filter(m => m.id !== msg.id);
            newMsgs.push(msg);
            return newMsgs;
        })
    },[])
    return [msgs, addMsg]
}
export default useMsgs;