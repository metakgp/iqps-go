import { FaChevronDown, FaChevronUp } from 'react-icons/fa6';

import './styles/form.scss';

interface IFormGroupProps {
	label: string;
	children: React.ReactNode;
	validationError?: string | null;
}
export function FormGroup(props: IFormGroupProps) {
	return <div className="form-group">
		<label>{props.label}</label>
		<div>
			{props.children}
			{props.validationError && (
				<p className="error-msg">
					{props.validationError}
				</p>
			)}
		</div>
	</div>
}

interface IRadioGroupProps<T> {
	value: T;
	options: {
		label: string;
		value: T;
	}[];
	onSelect: (value: T) => void;
}
export function RadioGroup<T>(props: IRadioGroupProps<T>) {
	return <div className="radio-group">
		{
			props.options.map(({ label, value }, i) => {
				return <label key={i}>
					<input
						type="radio"
						checked={props.value === value}
						onChange={(e) => e.currentTarget.checked && props.onSelect(value)}
					/>
					{label}
				</label>
			})
		}
	</div>
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