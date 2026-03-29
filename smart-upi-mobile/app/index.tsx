import { useRouter } from 'expo-router';
import HomeScreen from '../src/screens/HomeScreen';
import { makeNav } from '../src/utils/navBridge';

export default function HomeRoute() {
    const router = useRouter();
    return <HomeScreen navigation={makeNav(router)} />;
}
