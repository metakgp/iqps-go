import { FaChevronDown, FaChevronUp } from 'react-icons/fa6';

import './styles/form.scss';
import { useRef, useState } from 'react';
import useClickOutside from '../../utils/Hooks/useClickOutside';

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

export interface ISuggestion<T> {
	displayValue: string;
	context: T;
}
interface ISuggestionTextInputProps<T> {
	value: string;
	suggestions: ISuggestion<T>[];
	placeholder?: string;
	onSuggestionSelect?: (sugg: ISuggestion<T>) => void;
	onValueChange: (newValue: string) => void;
	inputProps: React.InputHTMLAttributes<HTMLInputElement> | {};
}
export function SuggestionTextInput<T>(props: ISuggestionTextInputProps<T>) {
	const [suggShown, setSuggShown] = useState<boolean>(false);
	const [selectedSugg, setSelectedSugg] = useState<number>(0);
	const suggestionRef = useRef<HTMLDivElement>(null);
	useClickOutside(suggestionRef, () => {
		setSuggShown(false);
	})

	const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
		e.preventDefault();

		if (selectedSugg < props.suggestions.length) {
			if (props.onSuggestionSelect) {
				props.onSuggestionSelect(props.suggestions[selectedSugg]);
			} else {
				props.onValueChange(props.suggestions[selectedSugg].displayValue);
			}
			setSuggShown(false);
			setSelectedSugg(0);
		}
	}

	const handleInput: React.FormEventHandler<HTMLInputElement> = (e) => {
		e.preventDefault();
		setSuggShown(true);
		props.onValueChange(e.currentTarget.value);
	}

	const handleKeyDown: React.KeyboardEventHandler<HTMLFormElement> = (e) => {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			setSelectedSugg((currentValue) => {
				return Math.min(props.suggestions.length - 1, currentValue + 1);
			})
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			setSelectedSugg((currentValue) => {
				return Math.max(0, currentValue - 1);
			})
		}
		else if (e.key === 'Enter') {
			handleSubmit(e);
		}
	}

	return <form
		className="sugg-text-form"
		onSubmit={handleSubmit}
		onKeyDown={handleKeyDown}
	>
		<input
			{...props.inputProps}
			type="text"
			className="sugg-text-input"
			value={props.value}
			onInput={handleInput}
			onFocus={(e) => {
				e.preventDefault();
				setSuggShown(true);
			}}
			aria-autocomplete="none"
			autoComplete="off"
			placeholder={props.placeholder}
		/>
		<div
			ref={suggestionRef}
			className={`suggestions ${(suggShown && props.suggestions.length > 0) ? '' : 'hidden'}`}>
			{props.suggestions.map((sugg, i) => (
				<button
					className={`suggestion ${i === selectedSugg ? 'selected' : ''}`}
					onClick={(e) => {
						e.preventDefault();
						e.stopPropagation();

						if (props.onSuggestionSelect) {
							props.onSuggestionSelect(sugg);
						} else {
							props.onValueChange(sugg.displayValue);
						}
						setSelectedSugg(0);
						setSuggShown(false);
					}}
				>
					{sugg.displayValue}
				</button>
			))}
		</div>
	</form>
}

