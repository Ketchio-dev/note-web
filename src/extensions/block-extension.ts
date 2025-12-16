/**
 * Tiptap Block Extension
 * Enables block-based editing within Tiptap
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface BlockExtensionOptions {
    onBlockChange?: (blocks: any[]) => void;
    enableDragHandle?: boolean;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        block: {
            /**
             * Toggle block selection
             */
            toggleBlockSelection: (position: number) => ReturnType;
            /**
             * Select block
             */
            selectBlock: (position: number) => ReturnType;
            /**
             * Delete selected block
             */
            deleteSelectedBlock: () => ReturnType;
            /**
             * Duplicate block
             */
            duplicateBlock: (position: number) => ReturnType;
        };
    }
}

export const BlockExtension = Extension.create<BlockExtensionOptions>({
    name: 'blocks',

    addOptions() {
        return {
            onBlockChange: undefined,
            enableDragHandle: true,
        };
    },

    addCommands() {
        return {
            toggleBlockSelection:
                (position) =>
                    ({ tr, dispatch }) => {
                        if (dispatch) {
                            tr.setSelection(Selection.near(tr.doc.resolve(position)));
                        }
                        return true;
                    },

            selectBlock:
                (position) =>
                    ({ tr, dispatch, state }) => {
                        if (dispatch) {
                            const $pos = state.doc.resolve(position);
                            const node = $pos.node();

                            if (node) {
                                const from = $pos.before();
                                const to = $pos.after();
                                tr.setSelection(NodeSelection.create(state.doc, from));
                            }
                        }
                        return true;
                    },

            deleteSelectedBlock:
                () =>
                    ({ tr, dispatch, state }) => {
                        const { selection } = state;
                        if (selection instanceof NodeSelection) {
                            if (dispatch) {
                                tr.deleteSelection();
                            }
                            return true;
                        }
                        return false;
                    },

            duplicateBlock:
                (position) =>
                    ({ tr, dispatch, state }) => {
                        const $pos = state.doc.resolve(position);
                        const node = $pos.nodeAfter;

                        if (node && dispatch) {
                            tr.insert($pos.after(), node.copy(node.content));
                        }
                        return true;
                    },
        };
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('blockDragHandle'),
                props: {
                    decorations: (state) => {
                        if (!this.options.enableDragHandle) {
                            return DecorationSet.empty;
                        }

                        const decorations: Decoration[] = [];
                        const { doc, selection } = state;

                        // Add drag handle decoration to each block
                        doc.descendants((node, pos) => {
                            if (node.isBlock && pos >= 0) {
                                decorations.push(
                                    Decoration.widget(pos, () => {
                                        const handle = document.createElement('div');
                                        handle.className =
                                            'drag-handle absolute left-0 top-0 opacity-0 hover:opacity-100 cursor-grab';
                                        handle.innerHTML = '⋮⋮';
                                        handle.draggable = true;

                                        // Drag events
                                        handle.addEventListener('dragstart', (e) => {
                                            e.dataTransfer?.setData('text/plain', pos.toString());
                                        });

                                        return handle;
                                    })
                                );
                            }
                        });

                        return DecorationSet.create(doc, decorations);
                    },

                    handleDOMEvents: {
                        drop: (view, event) => {
                            const pos = parseInt(event.dataTransfer?.getData('text/plain') || '-1');

                            if (pos >= 0) {
                                // Handle block reordering
                                const coords = view.posAtCoords({
                                    left: event.clientX,
                                    top: event.clientY,
                                });

                                if (coords) {
                                    const $pos = view.state.doc.resolve(pos);
                                    const node = $pos.nodeAfter;

                                    if (node) {
                                        view.dispatch(
                                            view.state.tr
                                                .delete($pos.pos, $pos.pos + node.nodeSize)
                                                .insert(coords.pos, node)
                                        );
                                    }
                                }

                                event.preventDefault();
                                return true;
                            }

                            return false;
                        },
                    },
                },
            }),

            // Block change detection
            new Plugin({
                key: new PluginKey('blockChangeDetection'),
                view: () => ({
                    update: (view, prevState) => {
                        if (this.options.onBlockChange && !view.state.doc.eq(prevState.doc)) {
                            // Extract blocks from document
                            const blocks: any[] = [];
                            view.state.doc.descendants((node, pos) => {
                                if (node.isBlock) {
                                    blocks.push({
                                        type: node.type.name,
                                        attrs: node.attrs,
                                        content: node.content.toJSON(),
                                        pos,
                                    });
                                }
                            });

                            this.options.onBlockChange(blocks);
                        }
                    },
                }),
            }),
        ];
    },

    addKeyboardShortcuts() {
        return {
            // Cmd+A: Select all
            'Mod-a': () => {
                return this.editor.commands.selectAll();
            },

            // Cmd+D: Duplicate block
            'Mod-d': () => {
                const { selection } = this.editor.state;
                return this.editor.commands.duplicateBlock(selection.from);
            },

            // Backspace: Delete block if selection
            Backspace: () => {
                const { selection } = this.editor.state;
                if (selection instanceof NodeSelection) {
                    return this.editor.commands.deleteSelectedBlock();
                }
                return false;
            },

            // Escape: Deselect block
            Escape: () => {
                const { state } = this.editor;
                this.editor.commands.setTextSelection(state.selection.from);
                return true;
            },
        };
    },
});

// Import required types
import { NodeSelection, Selection } from '@tiptap/pm/state';
