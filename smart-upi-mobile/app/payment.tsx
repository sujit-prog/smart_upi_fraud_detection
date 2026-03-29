import { useRouter, useLocalSearchParams } from 'expo-router';
import PaymentScreen from '../src/screens/PaymentScreen';
import { makeNav, parseParams } from '../src/utils/navBridge';

export default function PaymentRoute() {
    const router = useRouter();
    const raw    = useLocalSearchParams();
    const params = parseParams(raw);
    return <PaymentScreen navigation={makeNav(router)} route={{ params }} />;
}
