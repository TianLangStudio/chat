import { useRouter } from 'next/router'
export default  function Room() {
    const route = useRouter();
    const {no} = route.query;
    return (<div>{no}</div>)
}