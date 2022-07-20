import { request } from './request';
import rootScope from '../../lib/rootScope';
import { AuthSignIn } from '../../layer';
import App from '../../config/app';
import { showAuthPage } from './pages/pageAuthOperator';

class CRMOperator {

    constructor() {
        setInterval(() => {
            this.time();
        }, 1000 * 60);
    }

    public async auth(key: string) {
        try {
            var res = await request.post('operator/auth', {
                key: key
            })
            var body = res.data;
            return body;
        } catch (error) {
            showAuthPage();
        }
    }

    public async messageSended() {
        var res = await request.post('operator/message/sended', {
            key: localStorage.getItem('operator')
        })
        var body = res.data;
        return body;
    }

    public async dialogOpened() {
        var res = await request.post('operator/dialog/opened', {
            key: localStorage.getItem('operator')
        })
        var body = res.data;
        return body;
    }

    public async time() {
        try {
            var res = await request.post('operator/time', {
                key: localStorage.getItem('operator')
            })
            var body = res.data;
            return body;
        } catch (error) {

        }
    }
}

const crmOperator = new CRMOperator();
export default crmOperator

