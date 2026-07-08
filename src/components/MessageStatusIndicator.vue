<script setup lang="ts">
import type { MessageDeliveryStatus } from "../types/message";
import {
  MESSAGE_STATUS_LABELS,
  resolveMessageStatus,
} from "../utils/messageStatus";

const props = defineProps<{
  status?: MessageDeliveryStatus;
}>();

const resolvedStatus = resolveMessageStatus(props.status);
const label = MESSAGE_STATUS_LABELS[resolvedStatus];
</script>

<template>
  <span
    class="message-status"
    :class="`message-status-${resolvedStatus}`"
    :title="label"
    :aria-label="label"
  >
    <span
      v-if="resolvedStatus === 'SENDING'"
      class="message-status-spinner"
      aria-hidden="true"
    />

    <svg
      v-else-if="resolvedStatus === 'DELIVERED'"
      class="message-status-icon"
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <path d="M3 8.5 6.5 12 13 4" />
    </svg>

    <svg
      v-else
      class="message-status-icon message-status-icon-double"
      viewBox="0 0 20 16"
      aria-hidden="true"
    >
      <path d="M1 8.5 4.5 12 11 4" />
      <path d="M6 8.5 9.5 12 16 4" />
    </svg>
  </span>
</template>

<style scoped>
.message-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.message-status-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid #d1d5db;
  border-top-color: #6b7280;
  border-radius: 50%;
  animation: message-status-spin 0.8s linear infinite;
}

.message-status-icon {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.message-status-icon-double {
  width: 18px;
}

.message-status-sent {
  color: #9ca3af;
}

.message-status-delivered {
  color: #9ca3af;
}

.message-status-read {
  color: #2563eb;
}

@keyframes message-status-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
