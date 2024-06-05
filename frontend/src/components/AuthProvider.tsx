import { Accessor, JSX, createContext, createSignal, useContext } from "solid-js";

interface ILocalStorageAuthObj {
	jwt: string;
}

const getLsJwt = () => {
	const lsAuthKey = localStorage.getItem("auth");

	if (lsAuthKey !== null) {
		const auth = JSON.parse(lsAuthKey) as ILocalStorageAuthObj;

		if ('jwt' in auth) {
			return auth.jwt;
		} else {
			return null;
		}
	}

	return null;
};

const removeLsJwt = () => {
	localStorage.removeItem("auth");
}

const setLsJwt = (jwt: string) => {
	localStorage.setItem("auth", JSON.stringify({jwt}));
}

interface IAuthContext {
	isAuthenticated: Accessor<boolean>;
	jwt: Accessor<string | null>;
	logOut: () => void;
	logIn: (jwt: string) => void;
}

interface IAuthProviderProps {
	children: JSX.Element
}

const authContext = createContext<IAuthContext>();
export const AuthProvider = (props: IAuthProviderProps) => {
	const lsJwt = getLsJwt();

	const [isAuthenticated, setAuthenticated] = createSignal(lsJwt !== null);
	const [jwt, setJwt] = createSignal(lsJwt);

	const authContextValue: IAuthContext = {
		isAuthenticated,
		jwt,
		logOut: () => {
			removeLsJwt();
			setAuthenticated(false);
			setJwt(null);
		},
		logIn: (jwt) => {
			setLsJwt(jwt);
			setAuthenticated(true);
			setJwt(jwt);
		},
	}

	return <authContext.Provider value={authContextValue}>{props.children}</authContext.Provider>;
}

export function useAuth() {
	return useContext(authContext) as IAuthContext;
}