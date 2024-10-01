import { Link } from 'react-router-dom';

import './styles/common_styles.scss';
import { IconType } from 'react-icons';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa6';

export function Footer() {
	return <h3 className="meta-footer">Made with ❤️ and {"</>"} by <a href="https://github.com/metakgp/iqps-go" target="_blank">MetaKGP</a></h3>;
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

interface ISelectProps {
	value: React.SelectHTMLAttributes<HTMLSelectElement>['value'];
	onInput: React.FormEventHandler<HTMLSelectElement>;
	options: { value: string; title: string }[];
	id?: string;
	required?: boolean;
}
export function Select(props: ISelectProps) {
	return <div className="select-wrapper">
		<select
			value={props.value}
			onInput={props.onInput}
			id={props.id}
			required={props.required}
			className="select"
		>
			{props.options.map(({ value, title }, i) => <option key={i} value={value}>{title}</option>)}
		</select>
	</div>;
}

interface INumberInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	value: number;
	setValue: (x: number) => void;
}
export function NumberInput(props: INumberInputProps) {
	const getClickHandler = (change: number) => {
		return (e: React.MouseEvent<HTMLButtonElement>) => {
			e.preventDefault();
			const newValue = props.value + change;
			props.setValue(isNaN(newValue) ? 1 : newValue);
		}
	}

	return <div className="number-input">
		<input
			type="number"
			onChange={(e) => {
				e.preventDefault();
				props.setValue(parseInt(e.target.value));
			}}
			{...props}
		/>
		<div className="number-input-controls">
			<button className="btn inc" onClick={getClickHandler(1)}><FaChevronUp size="0.7rem" /></button>
			<button className="btn dec" onClick={getClickHandler(-1)}><FaChevronDown size="0.7rem" /></button>
		</div>
	</div>
}