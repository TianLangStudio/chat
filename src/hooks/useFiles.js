import {useCallback, useState} from "react";

export const useFiles = () => {
    const [path2FileMap, setPath2FileMap] = useState({});
    const onSelectedFile = useCallback((e) => {
        const target = e.target;
        const path = target.value;
        if(!path) {
            return;
        }
        const file = target.files[0];
        const file_info = {file:target.files[0], status:0, path};
        setPath2FileMap(preState => {
            const newState = {
                ...preState,
                [path]: {file:e.target.files[0], status:0}
            }

            return newState;
        });
        target.value = '';
        return file_info;

    }, [setPath2FileMap]);

    const  onRemoveFile = useCallback((path) => {
        setPath2FileMap((prevState) => {
            const {[path]: _, ...other} = prevState;
            return other
        })
    }, [setPath2FileMap]);
    const findFileByPath = useCallback((path) => {
        return path2FileMap[path];
    }, [path2FileMap])
    return [onSelectedFile, onRemoveFile, findFileByPath];
}