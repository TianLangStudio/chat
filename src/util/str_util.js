export const isJson = (str) => {
    if(!str) {
        return false;
    }
    str = str.trim();
    return str.startsWith('{') && str.endsWith('}');
}