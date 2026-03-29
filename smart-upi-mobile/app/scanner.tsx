import { useRouter, useLocalSearchParams } from 'expo-router';
import ScannerScreen from '../src/screens/ScannerScreen';
import { makeNav, parseParams } from '../src/utils/navBridge';

export default function ScannerRoute() {
    const router = useRouter();
    const raw    = useLocalSearchParams();
    const params = parseParams(raw);
    return <ScannerScreen navigation={makeNav(router)} route={{ params }} />;
}
