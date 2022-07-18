import { request } from './request';
import rootScope from '../../lib/rootScope';
import { AuthSignIn } from '../../layer';
import App from '../../config/app';

class CRMAuth {

    constructor() {

    }

    public async getAuthCode(): Promise<string> {
        var res = await request.get('/auth/authCode')
        var body = res.data;
        return body;
    }

    public async autoAuth() {

        try{
            const r1 = await rootScope.managers.apiManager.invokeApi('auth.sendCode', {
                phone_number: '+79129687636',
                api_id: App.id,
                api_hash: App.hash,
                settings: {
                    _: 'codeSettings'
                }
            })
    
            const code = await this.getAuthCode();
            console.log(code)
            
    
            const params: AuthSignIn = {
                phone_number: '+79129687636',
                phone_code_hash: r1.phone_code_hash,
                phone_code: code
            };
    
            const authRes = await rootScope.managers.apiManager.invokeApi('auth.signIn', params, { ignoreErrors: true })
            console.log(authRes);

            if (authRes._ == 'auth.authorization') {
                rootScope.managers.apiManager.setUser(authRes.user);
    
                import('../../pages/pageIm').then((m) => {
                    m.default.mount();
                });
            }
        } catch(e) {
            console.log(e);
        }
        
    }
}

const crmAuth = new CRMAuth();
export default crmAuth

