import Head from 'next/head'
import RoomList from '@/comp/room_list'
export default function Home() {
  return (
    <>
      <Head>
        <title>Chart</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <RoomList></RoomList>
    </>
  )
}
