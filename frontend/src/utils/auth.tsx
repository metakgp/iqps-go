import React, {
	createContext,
	useContext,
	useMemo,
	useState,
} from "react";

interface IAuthContext {
	jwt: string | null;
	onLogin: (jwt: string) => void;
	onLogout: () => void;
}

const DEFAULT_AUTH_CONTEXT: IAuthContext = {
	jwt: null,
	onLogin: () => { },
	onLogout: () => { }
};

const getLsAuthJwt = () => {
	return localStorage.getItem("jwt");
};

const AuthContext = createContext<IAuthContext>(DEFAULT_AUTH_CONTEXT);

export const useAuthContext = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const lsAuthJwt = getLsAuthJwt();
	const [isAuthenticated, setIsAuthenticated] = useState(
		lsAuthJwt !== null && lsAuthJwt !== "",
	);

	const onLogin = (jwt: string) => {
		setIsAuthenticated(true);
		localStorage.setItem("jwt", jwt);
	};

	const onLogout = () => {
		localStorage.removeItem("jwt");

		setIsAuthenticated(false);
	};

	const value = useMemo(
		() => ({
			isAuthenticated,
			jwt: lsAuthJwt,
			onLogin,
			onLogout
		}),
		[isAuthenticated, onLogin, onLogout],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
