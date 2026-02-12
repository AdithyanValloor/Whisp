import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "./store";

/**
 * Typed version of `useDispatch` for the application.
 * Ensures all dispatched actions are type-safe.
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/**
 * Typed version of `useSelector` for the application.
 * Provides type-safe access to the Redux store state.
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
