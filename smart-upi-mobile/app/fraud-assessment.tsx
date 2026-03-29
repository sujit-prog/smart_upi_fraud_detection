import { useRouter, useLocalSearchParams } from 'expo-router';
import FraudAssessmentScreen from '../src/screens/FraudAssessmentScreen';
import { makeNav, parseParams } from '../src/utils/navBridge';

export default function FraudAssessmentRoute() {
    const router = useRouter();
    const raw    = useLocalSearchParams();
    const params = parseParams(raw);
    return <FraudAssessmentScreen navigation={makeNav(router)} route={{ params }} />;
}
