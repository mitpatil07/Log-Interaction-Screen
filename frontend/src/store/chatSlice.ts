import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { syncFormState, fetchInteractions, fetchFollowups } from './interactionSlice';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: any[] | null;
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  sessionId: string;
  error: string | null;
}

const generateSessionId = () => {
  return 'sess_' + Math.random().toString(36).substr(2, 9);
};

const initialState: ChatState = {
  messages: [],
  isLoading: false,
  sessionId: generateSessionId(),
  error: null,
};

export const sendMessage = createAsyncThunk<
  { response: string; messages: ChatMessage[]; form_sync: any },
  string,
  { state: { chat: ChatState; interaction: any } }
>('chat/sendMessage', async (messageText, { getState, dispatch, rejectWithValue }) => {
  const { chat, interaction } = getState();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  
  // Create current form state context for the agent
  const currentFormState = {
    hcp_name: interaction.hcpName,
    interaction_type: interaction.interactionType,
    date: interaction.date,
    time: interaction.time,
    attendees: interaction.attendees,
    topics_discussed: interaction.topicsDiscussed,
    materials_shared: interaction.materialsShared,
    summary: interaction.summary,
    followup_date: interaction.followupDate,
    followup_task: interaction.followupTask,
  };

  try {
    const response = await fetch(`${backendUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: messageText,
        session_id: chat.sessionId,
        hcp_id: null,
        current_form_state: currentFormState,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to communicate with AI agent');
    }

    const data = await response.json();

    // If backend returned form syncing values, apply them to the form state
    if (data.form_sync) {
      dispatch(syncFormState(data.form_sync));
    }

    // Refresh database records in the background
    dispatch(fetchInteractions());
    dispatch(fetchFollowups());

    return data;
  } catch (err: any) {
    return rejectWithValue(err.message || 'Something went wrong');
  }
});

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addLocalUserMessage: (state, action: PayloadAction<string>) => {
      state.messages.push({
        id: 'msg_' + Math.random().toString(36).substr(2, 9),
        role: 'user',
        content: action.payload,
      });
    },
    clearChat: (state) => {
      state.messages = [];
      state.sessionId = generateSessionId();
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessage.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.isLoading = false;
        
        // Overwrite message history with server-confirmed history to keep tool calls correct
        const serverMsgs = action.payload.messages.map((m: any, idx: number) => ({
          id: `msg_srv_${idx}_${state.sessionId}`,
          role: m.role,
          content: m.content,
          tool_calls: m.tool_calls,
        }));
        
        if (serverMsgs.length > 0) {
          state.messages = serverMsgs;
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        // Inject system error message
        state.messages.push({
          id: 'error_' + Math.random().toString(36).substr(2, 9),
          role: 'system',
          content: `Error: ${action.payload as string || 'Unable to connect to backend server. Make sure it is running.'}`,
        });
      });
  },
});

export const { addLocalUserMessage, clearChat } = chatSlice.actions;
export default chatSlice.reducer;
