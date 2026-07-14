import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface HCP {
  id: number;
  name: string;
  specialty: string;
  email: string;
  npi_number: string;
}

export interface Interaction {
  id: number;
  hcp_id: number | null;
  hcp_name: string | null;
  interaction_type: string;
  date: string;
  time: string | null;
  attendees: string | null;
  topics_discussed: string | null;
  materials_shared: string | null;
  summary: string | null;
  sentiment: string | null;
  extracted_topics: string | null;
  created_at: string;
}

export interface FollowUp {
  id: number;
  hcp_id: number | null;
  hcp_name: string | null;
  followup_date: string;
  task_description: string;
  status: string;
  created_at: string;
}

export interface InteractionState {
  hcpName: string;
  interactionType: string;
  date: string;
  time: string;
  attendees: string;
  topicsDiscussed: string;
  materialsShared: string;
  summary: string;
  sentiment: string;
  extractedTopics: string;
  followupDate: string;
  followupTask: string;
  hcpsList: HCP[];
  interactionsList: Interaction[];
  followupsList: FollowUp[];
  isSubmitting: boolean;
  submissionStatus: 'idle' | 'success' | 'failed';
  errorMessage: string | null;
  editingInteractionId: number | null;
  isLoadingLists: boolean;
}

const getTodayDateString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getTodayTimeString = () => {
  const today = new Date();
  let hours = today.getHours();
  const minutes = String(today.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const strHours = String(hours).padStart(2, '0');
  return `${strHours}:${minutes} ${ampm}`;
};

const initialState: InteractionState = {
  hcpName: '',
  interactionType: 'Meeting',
  date: getTodayDateString(),
  time: getTodayTimeString(),
  attendees: '',
  topicsDiscussed: '',
  materialsShared: '',
  summary: '',
  sentiment: 'Neutral',
  extractedTopics: '',
  followupDate: '',
  followupTask: '',
  hcpsList: [],
  interactionsList: [],
  followupsList: [],
  isSubmitting: false,
  submissionStatus: 'idle',
  errorMessage: null,
  editingInteractionId: null,
  isLoadingLists: false,
};

// Async Thunks
export const fetchHcps = createAsyncThunk(
  'interaction/fetchHcps',
  async (_, { rejectWithValue }) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
    try {
      const response = await fetch(`${backendUrl}/api/hcps`);
      if (!response.ok) {
        throw new Error('Failed to fetch HCPs list');
      }
      return await response.json();
    } catch (err: any) {
      return rejectWithValue(err.message || 'Error fetching HCPs');
    }
  }
);

export const fetchInteractions = createAsyncThunk(
  'interaction/fetchInteractions',
  async (_, { rejectWithValue }) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
    try {
      const response = await fetch(`${backendUrl}/api/interactions`);
      if (!response.ok) {
        throw new Error('Failed to fetch interactions list');
      }
      return await response.json();
    } catch (err: any) {
      return rejectWithValue(err.message || 'Error fetching interactions');
    }
  }
);

export const fetchFollowups = createAsyncThunk(
  'interaction/fetchFollowups',
  async (_, { rejectWithValue }) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
    try {
      const response = await fetch(`${backendUrl}/api/followups`);
      if (!response.ok) {
        throw new Error('Failed to fetch follow-ups list');
      }
      return await response.json();
    } catch (err: any) {
      return rejectWithValue(err.message || 'Error fetching follow-ups');
    }
  }
);

const interactionSlice = createSlice({
  name: 'interaction',
  initialState,
  reducers: {
    updateField: (
      state,
      action: PayloadAction<{ field: keyof Omit<InteractionState, 'hcpsList' | 'interactionsList' | 'followupsList' | 'isSubmitting' | 'submissionStatus' | 'errorMessage' | 'editingInteractionId' | 'isLoadingLists'>; value: string }>
    ) => {
      const { field, value } = action.payload;
      state[field] = value as any;
    },
    syncFormState: (state, action: PayloadAction<Partial<Omit<InteractionState, 'hcpsList' | 'interactionsList' | 'followupsList' | 'isSubmitting' | 'submissionStatus' | 'errorMessage' | 'editingInteractionId' | 'isLoadingLists'>>>) => {
      Object.entries(action.payload).forEach(([key, val]) => {
        if (val !== undefined) {
          (state as any)[key] = val;
        }
      });
    },
    setHcpsList: (state, action: PayloadAction<HCP[]>) => {
      state.hcpsList = action.payload;
    },
    setSubmitting: (state, action: PayloadAction<boolean>) => {
      state.isSubmitting = action.payload;
    },
    setSubmissionStatus: (state, action: PayloadAction<'idle' | 'success' | 'failed'>) => {
      state.submissionStatus = action.payload;
    },
    setErrorMessage: (state, action: PayloadAction<string | null>) => {
      state.errorMessage = action.payload;
    },
    loadInteractionIntoForm: (state, action: PayloadAction<Interaction>) => {
      const inter = action.payload;
      state.editingInteractionId = inter.id;
      state.hcpName = inter.hcp_name || '';
      state.interactionType = inter.interaction_type || 'Meeting';
      state.date = inter.date;
      state.time = inter.time || '';
      state.attendees = inter.attendees || '';
      state.topicsDiscussed = inter.topics_discussed || '';
      state.materialsShared = inter.materials_shared || '';
      state.summary = inter.summary || '';
      state.sentiment = inter.sentiment || 'Neutral';
      state.extractedTopics = inter.extracted_topics || '';
      state.submissionStatus = 'idle';
      state.errorMessage = null;
    },
    cancelEditing: (state) => {
      state.editingInteractionId = null;
      state.hcpName = '';
      state.interactionType = 'Meeting';
      state.date = getTodayDateString();
      state.time = getTodayTimeString();
      state.attendees = '';
      state.topicsDiscussed = '';
      state.materialsShared = '';
      state.summary = '';
      state.sentiment = 'Neutral';
      state.extractedTopics = '';
      state.submissionStatus = 'idle';
      state.errorMessage = null;
    },
    resetForm: (state) => {
      state.hcpName = '';
      state.interactionType = 'Meeting';
      state.date = getTodayDateString();
      state.time = getTodayTimeString();
      state.attendees = '';
      state.topicsDiscussed = '';
      state.materialsShared = '';
      state.summary = '';
      state.sentiment = 'Neutral';
      state.extractedTopics = '';
      state.followupDate = '';
      state.followupTask = '';
      state.submissionStatus = 'idle';
      state.errorMessage = null;
      state.editingInteractionId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // HCPs
      .addCase(fetchHcps.pending, (state) => {
        state.isLoadingLists = true;
      })
      .addCase(fetchHcps.fulfilled, (state, action) => {
        state.isLoadingLists = false;
        state.hcpsList = action.payload;
      })
      .addCase(fetchHcps.rejected, (state) => {
        state.isLoadingLists = false;
      })
      // Interactions
      .addCase(fetchInteractions.pending, (state) => {
        state.isLoadingLists = true;
      })
      .addCase(fetchInteractions.fulfilled, (state, action) => {
        state.isLoadingLists = false;
        state.interactionsList = action.payload;
      })
      .addCase(fetchInteractions.rejected, (state) => {
        state.isLoadingLists = false;
      })
      // Follow-ups
      .addCase(fetchFollowups.pending, (state) => {
        state.isLoadingLists = true;
      })
      .addCase(fetchFollowups.fulfilled, (state, action) => {
        state.isLoadingLists = false;
        state.followupsList = action.payload;
      })
      .addCase(fetchFollowups.rejected, (state) => {
        state.isLoadingLists = false;
      });
  },
});

export const {
  updateField,
  syncFormState,
  setHcpsList,
  setSubmitting,
  setSubmissionStatus,
  setErrorMessage,
  loadInteractionIntoForm,
  cancelEditing,
  resetForm,
} = interactionSlice.actions;

export default interactionSlice.reducer;
