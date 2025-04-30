import { create } from 'zustand';
import { User, Position } from '../types';
import * as api from '../services/api';

interface UserState {
    users: User[];
    loading: boolean;
    error: string | null;
    selectedUser: User | null;
    userPositions: Position[];
    fetchUsers: () => Promise<void>;
    fetchUserPositions: (userId: number) => Promise<void>;
    selectUser: (user: User | null) => void;
    createUser: (user: Partial<User>) => Promise<number>;
    updateUser: (id: number, user: Partial<User>) => Promise<void>;
    deleteUser: (id: number) => Promise<void>;
    searchUsers: (query: string) => User[];
}

const useUserStore = create<UserState>((set, get) => ({
    users: [],
    loading: false,
    error: null,
    selectedUser: null,
    userPositions: [],

    fetchUsers: async () => {
        set({ loading: true, error: null });
        try {
            const response = await api.getUsers();
            set({ users: response.data, loading: false });
        } catch (error) {
            console.error('Error fetching users:', error);
            set({ error: 'Failed to fetch users', loading: false });
        }
    },

    fetchUserPositions: async (userId: number) => {
        set({ loading: true, error: null });
        try {
            const response = await api.getUserPositions(userId);
            set({ userPositions: response.data, loading: false });
        } catch (error) {
            console.error('Error fetching user positions:', error);
            set({ error: 'Failed to fetch user positions', loading: false });
        }
    },

    selectUser: (user: User | null) => {
        set({ selectedUser: user });
        if (user) {
            get().fetchUserPositions(user.id);
        }
    },

    createUser: async (user: Partial<User>): Promise<number> => {
        set({ loading: true, error: null });
        try {
            const response = await api.createUser(user);
            await get().fetchUsers(); // Refresh users after creating
            return response.data.id;
        } catch (error) {
            console.error('Error creating user:', error);
            set({ error: 'Failed to create user', loading: false });
            return -1;
        }
    },

    updateUser: async (id: number, user: Partial<User>): Promise<void> => {
        set({ loading: true, error: null });
        try {
            await api.updateUser(id, user);
            await get().fetchUsers(); // Refresh users after updating
            set({ loading: false });
        } catch (error) {
            console.error('Error updating user:', error);
            set({ error: 'Failed to update user', loading: false });
        }
    },

    deleteUser: async (id: number): Promise<void> => {
        set({ loading: true, error: null });
        try {
            await api.deleteUser(id);
            set(state => ({
                users: state.users.filter(user => user.id !== id),
                selectedUser: state.selectedUser?.id === id ? null : state.selectedUser,
                loading: false
            }));
        } catch (error) {
            console.error('Error deleting user:', error);
            set({ error: 'Failed to delete user', loading: false });
        }
    },

    searchUsers: (query: string) => {
        const lowerQuery = query.toLowerCase();
        return get().users.filter(user =>
            user.name.toLowerCase().includes(lowerQuery)
        );
    }
}));

export default useUserStore;