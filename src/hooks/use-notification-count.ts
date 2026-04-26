"use client";

import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useChecklistTemplatesStore, useChecklistSubmissionsStore } from "@/stores/checklists-store";
import { useTicketsStore } from "@/stores/tickets-store";
import { useWorkOrdersStore } from "@/stores/work-orders-store";
import { useCorrectiveActionsStore } from "@/stores/corrective-actions-store";
import { useRiskEvaluationsStore } from "@/stores/risk-evaluations-store";
import { useNotificationsStore } from "@/stores/notifications-store";
import { isVisibleToFieldApp } from "@/lib/template-activation";
import { isAssignedToUserOrTeam } from "@/lib/assignment-utils";

/**
 * Shared hook for notification badge count — same logic used by mobile and dashboard.
 */
export function useNotificationCount(): number {
  const { user } = useAuth();
  const { items: dbNotifications } = useNotificationsStore();
  const { items: checklistTemplates } = useChecklistTemplatesStore();
  const { items: checklistSubmissions } = useChecklistSubmissionsStore();
  const { items: tickets } = useTicketsStore();
  const { items: workOrders } = useWorkOrdersStore();
  const { items: correctiveActions } = useCorrectiveActionsStore();
  const { items: riskEvaluations } = useRiskEvaluationsStore();

  const [readDerivedCount, setReadDerivedCount] = React.useState(0);

  React.useEffect(() => {
    const read = () => {
      try {
        const stored = sessionStorage.getItem("harmoniq_read_derived");
        if (stored) {
          const ids = JSON.parse(stored) as string[];
          setReadDerivedCount(ids.length);
        } else {
          setReadDerivedCount(0);
        }
      } catch {
        setReadDerivedCount(0);
      }
    };
    read();
    window.addEventListener("harmoniq:derived-read", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("harmoniq:derived-read", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  return React.useMemo(() => {
    if (!user) return 0;

    const unreadDb = dbNotifications.filter(
      (n) => !n.read && n.user_id === user.id
    ).length;

    const completedIds = new Set(
      checklistSubmissions
        .filter((s) => s.submitter_id === user.id && s.status === "submitted")
        .map((s) => s.template_id)
    );
    const pendingTasks = checklistTemplates.filter(
      (template) =>
        template.company_id === user.company_id &&
        isVisibleToFieldApp(template) &&
        !completedIds.has(template.id),
    ).length;
    const openTickets = tickets.filter(
      (ticket) =>
        ticket.company_id === user.company_id &&
        ticket.status === "new" &&
        isAssignedToUserOrTeam(ticket, user),
    ).length;
    const openWorkOrders = workOrders.filter(
      (workOrder) =>
        workOrder.company_id === user.company_id &&
        isAssignedToUserOrTeam(workOrder, user) &&
        workOrder.status !== "completed" &&
        workOrder.status !== "cancelled",
    ).length;
    const openActions = correctiveActions.filter(
      (action) =>
        action.company_id === user.company_id &&
        isAssignedToUserOrTeam(action, user) &&
        action.status !== "completed",
    ).length;
    const assessmentFollowUp = riskEvaluations.filter(
      (evaluation) =>
        evaluation.company_id === user.company_id &&
        evaluation.submitter_id === user.id &&
        (evaluation.status === "draft" || evaluation.status === "submitted"),
    ).length;

    const totalDerived = pendingTasks + openTickets + openWorkOrders + openActions + assessmentFollowUp;
    return unreadDb + Math.max(0, totalDerived - readDerivedCount);
  }, [user, dbNotifications, checklistTemplates, checklistSubmissions, tickets, workOrders, correctiveActions, riskEvaluations, readDerivedCount]);
}
