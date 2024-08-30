import { Link } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';

import './common_styles.scss';
import { IconType } from 'react-icons';

export function Footer() {
	return <h3 className="meta-footer">Made with ❤️ and {"</>"} by <a href="https://github.com/metakgp/iqps-go" target="_blank">MetaKGP</a></h3>;
}

interface IHeaderProps {
	title: string;
	subtitle: string;
	link?: {
		to: string;
		text: string;
		button_text: string;
		icon: IconType;
	}
}
export function Header(props: IHeaderProps) {
	return <div className="header">
		<h1>IQPS - {props.title}</h1>
		<p>
			<i>{props.subtitle}</i>
		</p>
		{
			props.link &&
			<h3 className="header-link">
				{props.link.text} <Link to={props.link.to} className="header-link-btn"><props.link.icon size="1rem" />{props.link.button_text}</Link>
			</h3>
		}
	</div>;
}

export function Navbar() {
	return <></>;
}