export default defineAppConfig({
  ui: {
    colors: {
      primary: 'emerald',
      neutral: 'zinc',
    },
    icons: {
      loading: 'i-lucide-loader',
    },
    button: {
      slots: {
        base: 'select-none cursor-pointer',
      },
      variants: {
        size: {
          xs: {
            leadingIcon: 'size-2',
            trailingIcon: 'size-2',
          },
          sm: {
            leadingIcon: 'size-3',
            trailingIcon: 'size-3',
          },
          md: {
            leadingIcon: 'size-4',
            trailingIcon: 'size-4',
          },
          lg: {
            leadingIcon: 'size-5',
            trailingIcon: 'size-5',
          },
          xl: {
            leadingIcon: 'size-6',
            trailingIcon: 'size-6',
          },
          icon: {
            base: 'size-8 justify-center',
            leadingIcon: 'size-4',
            trailingIcon: 'size-4',
          },
        },
      },
    },
    input: {
      variants: {
        size: {
          xs: {
            leadingIcon: 'size-2',
            trailingIcon: 'size-2',
          },
          sm: {
            leadingIcon: 'size-3',
            trailingIcon: 'size-3',
          },
          md: {
            leadingIcon: 'size-4',
            trailingIcon: 'size-4',
          },
          lg: {
            leadingIcon: 'size-5',
            trailingIcon: 'size-5',
          },
          xl: {
            leadingIcon: 'size-6',
            trailingIcon: 'size-6',
          },
        },
      },
    },
    dropdownMenu: {
      variants: {
        size: {
          xs: {
            itemLeadingIcon: 'size-2',
            itemTrailingIcon: 'size-2',
          },
          sm: {
            itemLeadingIcon: 'size-3',
            itemTrailingIcon: 'size-3',
          },
          md: {
            itemLeadingIcon: 'size-4',
            itemTrailingIcon: 'size-4',
          },
          lg: {
            itemLeadingIcon: 'size-5',
            itemTrailingIcon: 'size-5',
          },
          xl: {
            itemLeadingIcon: 'size-6',
            itemTrailingIcon: 'size-6',
          },
        },
      },
    },
    select: {
      variants: {
        size: {
          xs: {
            leadingIcon: 'size-2',
            trailingIcon: 'size-2',
            itemLeadingIcon: 'size-2',
            itemTrailingIcon: 'size-2',
          },
          sm: {
            leadingIcon: 'size-3',
            trailingIcon: 'size-3',
            itemLeadingIcon: 'size-3',
            itemTrailingIcon: 'size-3',
          },
          md: {
            leadingIcon: 'size-4',
            trailingIcon: 'size-4',
            itemLeadingIcon: 'size-4',
            itemTrailingIcon: 'size-4',
          },
          lg: {
            leadingIcon: 'size-5',
            trailingIcon: 'size-5',
            itemLeadingIcon: 'size-5',
            itemTrailingIcon: 'size-5',
          },
          xl: {
            leadingIcon: 'size-6',
            trailingIcon: 'size-6',
            itemLeadingIcon: 'size-6',
            itemTrailingIcon: 'size-6',
          },
        },
      },
    },
    badge: {
      variants: {
        size: {
          xs: {
            leadingIcon: 'size-1',
            trailingIcon: 'size-1',
          },
          sm: {
            leadingIcon: 'size-2',
            trailingIcon: 'size-2',
          },
          md: {
            leadingIcon: 'size-3',
            trailingIcon: 'size-3',
          },
          lg: {
            leadingIcon: 'size-4',
            trailingIcon: 'size-4',
          },
          xl: {
            leadingIcon: 'size-5',
            trailingIcon: 'size-5',
          },
        },
      },
    },
  },
});
