"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { AppState, UserInfo, Message, LearnerProfile } from "@/types";

const STORAGE_KEY = "ngl-assessment-state";

type Action =
  | { type: "SET_USER_INFO"; payload: UserInfo }
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "SET_STEP"; payload: AppState["step"] }
  | { type: "SET_COMPLETE"; payload: boolean }
  | { type: "SET_PROFILE"; payload: LearnerProfile }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "RESET" }
  | { type: "RESTORE"; payload: AppState };

const initialState: AppState = {
  userInfo: null,
  conversation: [],
  isComplete: false,
  profile: null,
  step: "landing",
  error: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_USER_INFO":
      return { ...state, userInfo: action.payload };
    case "ADD_MESSAGE":
      return {
        ...state,
        conversation: [...state.conversation, action.payload],
      };
    case "SET_STEP":
      return { ...state, step: action.payload };
    case "SET_COMPLETE":
      return { ...state, isComplete: action.payload };
    case "SET_PROFILE":
      return { ...state, profile: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "RESET":
      return { ...initialState };
    case "RESTORE":
      return action.payload;
    default:
      return state;
  }
}

interface ContextType {
  state: AppState;
  setUserInfo: (info: UserInfo) => void;
  addMessage: (msg: Message) => void;
  setStep: (step: AppState["step"]) => void;
  setComplete: (v: boolean) => void;
  setProfile: (p: LearnerProfile) => void;
  setError: (e: string | null) => void;
  reset: () => void;
}

const AssessmentContext = createContext<ContextType | null>(null);

export function AssessmentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AppState;
        dispatch({ type: "RESTORE", payload: parsed });
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const setUserInfo = useCallback((info: UserInfo) => {
    dispatch({ type: "SET_USER_INFO", payload: info });
  }, []);

  const addMessage = useCallback((msg: Message) => {
    dispatch({ type: "ADD_MESSAGE", payload: msg });
  }, []);

  const setStep = useCallback((step: AppState["step"]) => {
    dispatch({ type: "SET_STEP", payload: step });
  }, []);

  const setComplete = useCallback((v: boolean) => {
    dispatch({ type: "SET_COMPLETE", payload: v });
  }, []);

  const setProfile = useCallback((p: LearnerProfile) => {
    dispatch({ type: "SET_PROFILE", payload: p });
  }, []);

  const setError = useCallback((e: string | null) => {
    dispatch({ type: "SET_ERROR", payload: e });
  }, []);

  const reset = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    dispatch({ type: "RESET" });
  }, []);

  return (
    <AssessmentContext.Provider
      value={{
        state,
        setUserInfo,
        addMessage,
        setStep,
        setComplete,
        setProfile,
        setError,
        reset,
      }}
    >
      {children}
    </AssessmentContext.Provider>
  );
}

export function useAssessment() {
  const ctx = useContext(AssessmentContext);
  if (!ctx) throw new Error("useAssessment must be used within AssessmentProvider");
  return ctx;
}
