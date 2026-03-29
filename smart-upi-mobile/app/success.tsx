import { useRouter, useLocalSearchParams } from 'expo-router';
import SuccessScreen from '../src/screens/SuccessScreen';
import { makeNav, parseParams } from '../src/utils/navBridge';

export default function SuccessRoute() {
    const router = useRouter();
    const raw    = useLocalSearchParams();
    const params = parseParams(raw);
    return <SuccessScreen navigation={makeNav(router)} route={{ params }} />;
}
