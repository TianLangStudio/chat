import {Typography} from "@mui/material";

const TextMsg = (props) => {
    let {content} = props;
    return ( <Typography>
        {content}
    </Typography>)
}
export const createTextMsg = (msgInfo) => {
    let render = () => {
        return <TextMsg content={msgInfo.content}/>
    }
    return {...msgInfo, render};
}
export default TextMsg;