import { Link } from 'react-router-dom';

import './styles/common_styles.scss';
import { IconType } from 'react-icons';

export function Footer() {
	return <h3 className="meta-footer">
        Contribute on <a href="https://github.com/metakgp/iqps-go" target="_blank">GitHub</a> | 
        Made with ❤️ and {"</>"} by <a href="https://github.com/metakgp" target="_blank">MetaKGP</a>
    </h3>;
}

interface ILinkCommonProps {
	text: string;
	button_text: string;
	icon: IconType;
}
interface ILinkTo extends ILinkCommonProps {
	to: string;
}
interface ILinkClick extends ILinkCommonProps {
	onClick: React.MouseEventHandler<HTMLButtonElement>;
}
interface IHeaderProps {
	title: string;
	subtitle: string;
	link?: ILinkTo | ILinkClick;
}
export function Header(props: IHeaderProps) {
	const linkButtonInnerHtml = props.link && <><props.link.icon size="1rem" />{props.link.button_text}</>;

	return <div className="header">
		<h1>IQPS - {props.title}</h1>
		<p>
			<i>{props.subtitle}</i>
		</p>
		{
			props.link &&
			<h3 className="header-link">
				{props.link.text} {
					'to' in props.link ?
						<Link to={props.link.to} className="header-link-btn">{linkButtonInnerHtml}</Link> :
						<button onClick={props.link.onClick} className="header-link-btn">{linkButtonInnerHtml}</button>
				}
			</h3>
		}
	</div>;
}

export function Navbar() {
	return <></>;
}
