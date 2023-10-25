import Box from "@mui/material/Box";
import {Button, Fade, Grid, Typography} from "@mui/material";
import {useState} from "react";
import IconButton from "@mui/material/IconButton";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CancelPresentationOutlinedIcon from '@mui/icons-material/CancelPresentationOutlined';
const SendFileDirectly = () => {
    const [path2FileMap, setPath2FileMap] = useState({});
    const onSelectedFile = (e) => {
        const target = e.target;
        const path = target.value;
        if(!path) {
            return;
        }
        const file = target.files[0];
        setPath2FileMap(preState => {
                const newState = {
                    ...preState,
                    [path]: {file:e.target.files[0], status:0}
                }

                return newState;
        });
        target.value = '';
    }

    const  onRemoveFile = (path) => {
        setPath2FileMap((prevState) => {
            const {[path]: _, ...other} = prevState;
            return other
        })
    }

    return (<Box sx={{
        display: 'flex',
        justifySelf: 'center',
        flexDirection: 'column',
        alignSelf: 'center',
        justifyItems: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        alignContent: 'center',
        height: '100%',
    }}>
        {Object.keys(path2FileMap).map((path, i) => {
            const file = path2FileMap[path];
            return (
                <Grid container spacing={2} key={path}>
                    <Grid item xs={12} md={4} sx={{
                        textAlign:'right',
                    }}>
                        <Typography variant="h5" component="span">
                            {(i+1) + '.' + file.file.name}
                            <IconButton onClick={() => {onRemoveFile(path);}}>
                                <CancelPresentationOutlinedIcon/>
                            </IconButton>
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={4} sx={{
                        textAlign:'center'
                    }}>
                        <Typography variant="h5">
                            {file.status}
                        </Typography>

                    </Grid>
                    <Grid item xs={12} md={4} sx={{
                        textAlign: 'left'
                    }}>
                        <Typography variant="h5" component="span">
                        url
                        </Typography>
                        <IconButton>
                            <ContentCopyIcon/>
                        </IconButton>
                    </Grid>
                </Grid>
            )
        })}
        <Fade in={Object.keys(path2FileMap).length > 0}>
            <Typography variant="h5">
                Open
                <span> url</span>
                <IconButton>
                    <ContentCopyIcon/>
                </IconButton>
                on the receive device
            </Typography>
        </Fade>
        <Button
            variant="contained"
            component="label"
        >
            Select File to Send
            <input
                type="file"
                hidden
                onChange={onSelectedFile}
            />
        </Button>
    </Box>)
}
export default SendFileDirectly;