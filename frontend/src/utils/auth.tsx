import React, {
	createContext,
	useContext,
	useMemo,
	useState,
} from "react";
import { useNavigate } from "react-router-dom";

interface IAuthContext {
	isAuthenticated: boolean;
	jwt: string | null;
	login: (jwt: string) => void;
	logout: () => void;
}

const DEFAULT_AUTH_CONTEXT: IAuthContext = {
	isAuthenticated: false,
	jwt: null,
	login: () => { },
	logout: () => { }
};

const getLsAuthJwt = () => {
	return localStorage.getItem("jwt");
};

const AuthContext = createContext<IAuthContext>(DEFAULT_AUTH_CONTEXT);

export const useAuthContext = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const navigate = useNavigate();

	const lsAuthJwt = getLsAuthJwt();
	const [isAuthenticated, setIsAuthenticated] = useState(
		lsAuthJwt !== null && lsAuthJwt !== "",
	);

	const login = (jwt: string) => {
		localStorage.setItem("jwt", jwt);
		setIsAuthenticated(true);
	};

	const logout = () => {
		localStorage.removeItem("jwt");
		setIsAuthenticated(false);
		navigate('/');
	};

	const value = useMemo(
		() => ({
			isAuthenticated,
			jwt: lsAuthJwt,
			login,
			logout
		}),
		[isAuthenticated, login, logout],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const OAUTH_LOGIN_URL = `https://github.com/login/oauth/authorize?client_id=${import.meta.env.VITE_GH_OAUTH_CLIENT_ID}`;