import {Transport} from '@nestjs/microservices';

export default function getCmdMicroservices(sName: string, sEnv: 'local' | 'dev' | 'qas' | 'prd' | string, sTransport: Transport): string {
    if (sTransport === Transport.TCP) {
        return sName;
    } else if (sTransport === Transport.RMQ) {
        return sName;
    } else if (sTransport === Transport.REDIS) {
        return sName + '.' + sEnv;
    } else {
        return null;
    }
};