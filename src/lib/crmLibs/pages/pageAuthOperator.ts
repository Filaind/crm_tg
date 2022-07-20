import Button from "../../../components/button";
import InputField from "../../../components/inputField";
import { putPreloader } from "../../../components/putPreloader";
import toggleDisability from "../../../helpers/dom/toggleDisability";
import I18n from "../../langPack";
import crmOperator from "../operators";

var page: HTMLElement;

function createPage() {
    page = document.createElement('div');
    page.style.width = '100%';
    page.style.height = '100%';
    page.style.position = 'absolute';
    page.style.backgroundColor = 'rgb(24, 24, 24)';
    page.style.zIndex = "100000";
    page.style.display = 'none';

    page.style.flexDirection = "column";
    page.style.alignItems = "center";
    page.style.justifyContent = "center";


    const input = new InputField({
        labelText: 'Укажите код оператора',
        maxLength: 128,
    });
    input.container.style.minWidth = "300px";

    const acceptButton = Button('btn-primary btn-color-primary');
    acceptButton.append(new I18n.IntlElement({ key: 'Login.Next' }).element);
    acceptButton.style.marginTop = '10px';
    acceptButton.style.width = '300px';

    acceptButton.addEventListener('click', function (this: typeof acceptButton, e) {
        const toggle = toggleDisability([acceptButton], true);
        const preloader = putPreloader(acceptButton);
        crmOperator.auth(input.value).then((res) => {
            if (res.state === 0) {
                localStorage.setItem('operator', input.value);
                page.style.display = 'none';
            }
            else{
                input.setError("Оператор не найден")
            }

            toggle();
            preloader.remove();
        });
    })

    page.append(input.container, acceptButton);
    document.getElementById('page-chats').append(page);
}

export function showAuthPage() {
    page.style.display = 'flex';
}
export function hideAuthPage() {
    page.style.display = 'none';
}

createPage();