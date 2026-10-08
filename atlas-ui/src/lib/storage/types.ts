export type Vault = {
  id: string;
  name: string;
  createdAt: string;
  tree?: Tree;
};

export type Tree = {
  rootFolderIds: string[];
  rootFileIds: string[];
  folders: Record<string, {
    id: string; 
    name: string; 
    parentFolderId: string | null;
    childFolderIds: string[]; 
    childFileIds: string[];
  }>;
  files: Record<string, {
    id: string; 
    name: string; 
    type: "note" | "canvas";
    folderId: string | null; 
    createdAt: string;
    updatedAt: string;
  }>;
};

export interface VaultStore {
  getLastLogIn(): Promise<string | null>;
  setLastLogIn(dateTime: string): Promise<void>;
  createVault(name?: string): Promise<Vault>;
}