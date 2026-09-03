import { useCallback, useRef, useState } from 'react';
import { mutatePricingEditorAction } from '../actions';
import type { PricingItem } from './types';

interface MutationState {
  mutationBusy: boolean;
  movingId: string | null;
  pendingToggleId: string | null;
  deletingKey: string | null;
  saving: boolean;
  actionError: string | null;
}

export function usePricingMutations(
  items: PricingItem[],
  setItems: React.Dispatch<React.SetStateAction<PricingItem[]>>,
  fetchItems: () => Promise<boolean>
) {
  const [mutationState, setMutationState] = useState<MutationState>({
    mutationBusy: false,
    movingId: null,
    pendingToggleId: null,
    deletingKey: null,
    saving: false,
    actionError: null,
  });

  const mutationGenerationRef = useRef(0);
  const mutationInFlightRef = useRef(false);
  const createInFlightRef = useRef(false);
  const saveItemInFlightRef = useRef(new Set<string>());
  const slideMoveInFlightRef = useRef(new Set<string>());
  const toggleTokensRef = useRef(new Map<string, symbol>());
  const reorderInFlightRef = useRef(false);
  const renameInFlightRef = useRef(new Set<string>());

  const runPricingMutation = useCallback(
    async (input: Parameters<typeof mutatePricingEditorAction>[0]) => {
      mutationGenerationRef.current += 1;
      return mutatePricingEditorAction(input);
    },
    []
  );

  const beginMutation = useCallback(() => {
    if (mutationInFlightRef.current) return false;
    mutationInFlightRef.current = true;
    setMutationState((prev) => ({ ...prev, mutationBusy: true }));
    return true;
  }, []);

  const finishMutation = useCallback(() => {
    mutationInFlightRef.current = false;
    setMutationState((prev) => ({ ...prev, mutationBusy: false }));
  }, []);

  const setActionError = useCallback((error: string | null) => {
    setMutationState((prev) => ({ ...prev, actionError: error }));
  }, []);

  const reorderItems = useCallback(
    async (orderedItems: { id: string; order_index: number }[], movingKey: string) => {
      if (
        mutationState.movingId ||
        mutationState.pendingToggleId ||
        mutationState.deletingKey ||
        reorderInFlightRef.current ||
        mutationInFlightRef.current
      )
        return;
      if (!beginMutation()) return;

      const previousItems = items;
      setActionError(null);
      setMutationState((prev) => ({ ...prev, movingId: movingKey }));
      reorderInFlightRef.current = true;

      try {
        await runPricingMutation({ kind: 'reorder', items: orderedItems });
      } catch (error) {
        try {
          await runPricingMutation({
            kind: 'reorder',
            items: previousItems.map((item) => ({ id: item.id, order_index: item.order_index })),
          });
        } catch {}
        await fetchItems();
        setActionError(
          `Не удалось изменить порядок: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`
        );
      } finally {
        reorderInFlightRef.current = false;
        setMutationState((prev) => ({ ...prev, movingId: null }));
        finishMutation();
      }
    },
    [items, mutationState, beginMutation, finishMutation, runPricingMutation, fetchItems, setActionError]
  );

  const saveItem = useCallback(
    async (id: string, updates: { name: string; price: string; features: string }) => {
      if (
        saveItemInFlightRef.current.has(id) ||
        slideMoveInFlightRef.current.has(id) ||
        mutationInFlightRef.current
      )
        return;
      if (!beginMutation()) return;
      saveItemInFlightRef.current.add(id);
      setMutationState((prev) => ({ ...prev, saving: true }));

      try {
        await runPricingMutation({
          kind: 'updateItem',
          id,
          name: updates.name,
          price: updates.price,
          features: updates.features,
        });
        await fetchItems();
        return true;
      } catch (error) {
        setActionError(`Не удалось сохранить услугу: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
        return false;
      } finally {
        saveItemInFlightRef.current.delete(id);
        setMutationState((prev) => ({ ...prev, saving: false }));
        finishMutation();
      }
    },
    [beginMutation, finishMutation, runPricingMutation, fetchItems, setActionError]
  );

  const toggleVisibility = useCallback(
    async (id: string) => {
      if (
        mutationState.movingId ||
        mutationState.pendingToggleId ||
        mutationState.deletingKey ||
        toggleTokensRef.current.size > 0 ||
        mutationInFlightRef.current
      )
        return;
      if (toggleTokensRef.current.has(id)) return;
      const previousVisible = items.find((item) => item.id === id)?.visible;
      if (previousVisible === undefined) return;
      if (!beginMutation()) return;

      const token = Symbol(id);
      toggleTokensRef.current.set(id, token);
      const nextVisible = !previousVisible;
      setActionError(null);
      setMutationState((prev) => ({ ...prev, pendingToggleId: id }));
      setItems((current) => current.map((item) => (item.id === id ? { ...item, visible: nextVisible } : item)));

      try {
        await runPricingMutation({ kind: 'toggleVisibility', id, visible: nextVisible });
        if (toggleTokensRef.current.get(id) !== token) return;
        await fetchItems();
      } catch (error) {
        if (toggleTokensRef.current.get(id) !== token) return;
        setItems((current) => current.map((item) => (item.id === id ? { ...item, visible: previousVisible } : item)));
        setActionError(
          `Не удалось изменить видимость услуги: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`
        );
      } finally {
        if (toggleTokensRef.current.get(id) === token) {
          toggleTokensRef.current.delete(id);
          setMutationState((prev) => ({ ...prev, pendingToggleId: null }));
        }
        finishMutation();
      }
    },
    [items, mutationState, beginMutation, finishMutation, runPricingMutation, fetchItems, setItems, setActionError]
  );

  const deleteItem = useCallback(
    async (id: string, name: string) => {
      if (
        mutationState.movingId ||
        mutationState.pendingToggleId ||
        mutationState.deletingKey ||
        mutationInFlightRef.current
      )
        return;
      if (!confirm(`Удалить "${name}"?`)) return;
      if (!beginMutation()) return;
      setActionError(null);
      setMutationState((prev) => ({ ...prev, deletingKey: `item:${id}` }));

      try {
        await runPricingMutation({ kind: 'deleteItem', id });
        setItems((current) => current.filter((item) => item.id !== id));
        await fetchItems();
      } catch (error) {
        await fetchItems();
        alert(`Не удалось удалить услугу: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
      } finally {
        setMutationState((prev) => ({ ...prev, deletingKey: null }));
        finishMutation();
      }
    },
    [mutationState, beginMutation, finishMutation, runPricingMutation, fetchItems, setItems, setActionError]
  );

  const createItem = useCallback(
    async (itemData: {
      category: string;
      name: string;
      description: string;
      price: string;
      features: string;
    }) => {
      if (createInFlightRef.current || mutationInFlightRef.current || !beginMutation()) return false;
      createInFlightRef.current = true;

      try {
        await runPricingMutation({ kind: 'createItem', ...itemData });
        await fetchItems();
        return true;
      } catch (error) {
        setActionError(`Не удалось добавить услугу: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
        return false;
      } finally {
        createInFlightRef.current = false;
        finishMutation();
      }
    },
    [beginMutation, finishMutation, runPricingMutation, fetchItems, setActionError]
  );

  const renameCategory = useCallback(
    async (oldName: string, newName: string) => {
      const renameKey = `category:${oldName}`;
      if (renameInFlightRef.current.has(renameKey) || mutationInFlightRef.current || !beginMutation()) return false;
      renameInFlightRef.current.add(renameKey);

      try {
        await runPricingMutation({ kind: 'renameCategory', oldName, newName });
        await fetchItems();
        return true;
      } catch (error) {
        setActionError(
          `Не удалось переименовать категорию: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`
        );
        return false;
      } finally {
        renameInFlightRef.current.delete(renameKey);
        finishMutation();
      }
    },
    [beginMutation, finishMutation, runPricingMutation, fetchItems, setActionError]
  );

  const deleteCategory = useCallback(
    async (category: string) => {
      if (
        mutationState.movingId ||
        mutationState.pendingToggleId ||
        mutationState.deletingKey ||
        mutationInFlightRef.current
      )
        return;
      if (!confirm(`Удалить "${category}" и все услуги?`)) return;
      if (!beginMutation()) return;
      setActionError(null);
      setMutationState((prev) => ({ ...prev, deletingKey: `category:${category}` }));

      try {
        await runPricingMutation({ kind: 'deleteCategory', category });
        setItems((current) =>
          current.filter((item) => (item.category || 'Без категории') !== category)
        );
        await fetchItems();
      } catch (error) {
        await fetchItems();
        alert(`Не удалось удалить категорию: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
      } finally {
        setMutationState((prev) => ({ ...prev, deletingKey: null }));
        finishMutation();
      }
    },
    [mutationState, beginMutation, finishMutation, runPricingMutation, fetchItems, setItems, setActionError]
  );

  const renameSubsection = useCallback(
    async (category: string, oldName: string, newName: string) => {
      const renameKey = `subsection:${category}:${oldName}`;
      if (renameInFlightRef.current.has(renameKey) || mutationInFlightRef.current || !beginMutation()) return false;
      renameInFlightRef.current.add(renameKey);

      try {
        await runPricingMutation({ kind: 'renameSubsection', category, oldName, newName });
        await fetchItems();
        return true;
      } catch (error) {
        setActionError(
          `Не удалось переименовать подраздел: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`
        );
        return false;
      } finally {
        renameInFlightRef.current.delete(renameKey);
        finishMutation();
      }
    },
    [beginMutation, finishMutation, runPricingMutation, fetchItems, setActionError]
  );

  const deleteSubsection = useCallback(
    async (category: string, subsection: string) => {
      if (
        mutationState.movingId ||
        mutationState.pendingToggleId ||
        mutationState.deletingKey ||
        mutationInFlightRef.current
      )
        return;
      if (!confirm(`Удалить "${subsection}" и все услуги?`)) return;
      if (!beginMutation()) return;
      setActionError(null);
      setMutationState((prev) => ({ ...prev, deletingKey: `sub:${category}:${subsection}` }));

      try {
        await runPricingMutation({ kind: 'deleteSubsection', category, subsection });
        setItems((current) =>
          current.filter((item) => {
            const itemCategory = item.category || 'Без категории';
            const itemSubsection = item.description || 'Общие';
            return itemCategory !== category || itemSubsection !== subsection;
          })
        );
        await fetchItems();
      } catch (error) {
        await fetchItems();
        alert(`Не удалось удалить подраздел: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
      } finally {
        setMutationState((prev) => ({ ...prev, deletingKey: null }));
        finishMutation();
      }
    },
    [mutationState, beginMutation, finishMutation, runPricingMutation, fetchItems, setItems, setActionError]
  );

  const moveToSlide = useCallback(
    async (id: string, slideIndex: number, features: string) => {
      if (
        mutationState.movingId ||
        mutationState.pendingToggleId ||
        mutationState.deletingKey ||
        mutationInFlightRef.current
      )
        return;
      if (saveItemInFlightRef.current.has(id) || slideMoveInFlightRef.current.has(id) || !beginMutation()) return;
      slideMoveInFlightRef.current.add(id);
      setMutationState((prev) => ({ ...prev, movingId: id }));
      setActionError(null);

      try {
        await runPricingMutation({ kind: 'moveToSlide', id, slideIndex, features });
        await fetchItems();
      } catch (error) {
        setActionError(
          `Не удалось изменить страницу услуги: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`
        );
      } finally {
        slideMoveInFlightRef.current.delete(id);
        setMutationState((prev) => ({ ...prev, movingId: null }));
        finishMutation();
      }
    },
    [mutationState, beginMutation, finishMutation, runPricingMutation, fetchItems, setActionError]
  );

  return {
    mutationState,
    mutationGenerationRef,
    reorderItems,
    saveItem,
    toggleVisibility,
    deleteItem,
    createItem,
    renameCategory,
    deleteCategory,
    renameSubsection,
    deleteSubsection,
    moveToSlide,
    setActionError,
  };
}
