"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from "react";
import type { Character } from "@/lib/characters";
export type Snapshot = { id: string; time: string; sheet: Character };
type Session = {
  characters: Character[];
  setCharacters: Dispatch<SetStateAction<Character[]>>;
  snapshots: Snapshot[];
  setSnapshots: Dispatch<SetStateAction<Snapshot[]>>;
  dirty: boolean;
  setDirty: Dispatch<SetStateAction<boolean>>;
};
const Context = createContext<Session | null>(null);
export function CharacterSessionProvider({ children }: { children: ReactNode }) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  return (
    <Context.Provider
      value={{ characters, setCharacters, snapshots, setSnapshots, dirty, setDirty }}
    >
      {children}
    </Context.Provider>
  );
}
export function useCharacterSession() {
  const session = useContext(Context);
  if (!session) throw new Error("Character session provider missing");
  return session;
}
