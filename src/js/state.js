/* eslint-disable no-use-before-define */
import gitfred from 'gitfred';
import {
  getParam,
  readFromJSONFile,
  ensureDemoIdInPageURL,
  ensureUniqueFileName
} from './utils';
import { IS_PROD } from './constants';
import { cleanUpExecutedCSS } from './utils/executeCSS';
import { DEFAULT_LAYOUT } from './layout';
import API from './providers/api';
import LS from './utils/localStorage';

const git = gitfred();
const LS_PROFILE_KEY = 'DEMOIT_PROFILE';
const DEFAULT_STATE = {
  name: '',
  desc: '',
  published: false,
  editor: {
    theme: 'light',
    statusBar: false,
    layout: DEFAULT_LAYOUT
  },
  dependencies: [],
  files: {},
  story: []
};

const getFirstFile = function () {
  const allFiles = git.getAll();

  if (allFiles.length === 0) {
    return 'untitled.js';
  }
  return git.getAll()[0][0];
};
const resolveActiveFile = function () {
  const hash = location.hash.replace(/^#/, '');

  if (hash !== '' && git.get(hash)) return hash;
  return getFirstFile();
};

export default async function createState(version) {
  const onChangeListeners = [];
  const onChange = () => onChangeListeners.forEach(c => c());
  let profile = LS(LS_PROFILE_KEY);
  let pendingChanges = false;

  var state = window.state;

  if (!state) {
    const stateFromURL = getParam('state');

    if (stateFromURL) {
      try {
        state = await readFromJSONFile(stateFromURL);
      } catch (error) {
        console.error(`Error reading ${ stateFromURL }`);
      }
    } else {
      state = DEFAULT_STATE;
    }
  }

  state.v = version;

  git.import(state.files);
  git.listen(event => {
    if (event === git.ON_COMMIT || event === git.ON_CHECKOUT) {
      persist();
    }
    onChange();
  });

  let activeFile = resolveActiveFile();

  const persist = (fork = false, done = () => {}) => {
    if (IS_PROD && api.loggedIn()) {
      if (fork) { delete state.owner; }
      if (!api.isDemoOwner()) { return; }
      API.saveDemo(state, profile.token).then(demoId => {
        if (demoId && demoId !== state.demoId) {
          state.demoId = demoId;
          state.owner = profile.id;
          ensureDemoIdInPageURL(demoId);
        }
        done();
      });
    }
  };

  const api = {
    getDemoId() {
      if (!state.demoId) {
        throw new Error('There is no demoId!');
      }
      return state.demoId;
    },
    getActiveFile() {
      return activeFile;
    },
    getActiveFileContent() {
      return git.get(activeFile).c;
    },
    setActiveFile(filename) {
      activeFile = filename;
      location.hash = filename;
      onChange();
      return filename;
    },
    setActiveFileByIndex(index) {
      const filename = git.getAll()[index][0];

      if (filename) {
        this.setActiveFile(filename);
        onChangeListeners.forEach(c => c());
      }
    },
    isCurrentFile(filename) {
      return activeFile === filename;
    },
    isDemoOwner() {
      return state.owner && state.owner === profile.id;
    },
    getFiles() {
      return git.getAll();
    },
    getNumOfFiles() {
      return git.getAll().length;
    },
    meta(meta) {
      if (meta) {
        const { name, description, published } = meta;

        state.name = name;
        state.desc = description;
        state.published = !!published;
        onChange();
        persist();
        return null;
      }
      return {
        id: this.getDemoId(),
        name: state.name,
        description: state.desc,
        published: !!state.published
      };
    },
    getDependencies() {
      return state.dependencies;
    },
    setDependencies(dependencies) {
      state.dependencies = dependencies;
      persist();
    },
    getEditorSettings() {
      return state.editor;
    },
    editFile(filename, updates) {
      git.save(filename, updates);
      persist();
    },
    renameFile(filename, newName) {
      if (activeFile === filename) {
        this.setActiveFile(newName);
      }
      git.rename(filename, newName);
      persist();
    },
    addNewFile(filename = 'untitled.js') {
      filename = git.get(filename) ? ensureUniqueFileName(filename) : filename;
      git.save(filename, { c: '' });
      this.setActiveFile(filename);
      persist();
    },
    deleteFile(filename) {
      cleanUpExecutedCSS(filename);
      git.del(filename);
      if (filename === activeFile) {
        this.setActiveFile(getFirstFile());
      }
      persist();
    },
    listen(callback) {
      onChangeListeners.push(callback);
    },
    updateLayout(newLayout) {
      state.editor.layout = newLayout;
    },
    updateTheme(newTheme) {
      state.editor.theme = newTheme;
      persist();
    },
    updateStatusBarVisibility(value) {
      state.editor.statusBar = value;
    },
    setEntryPoint(filename) {
      const newValue = !git.get(filename).en;

      git.saveAll({ en: false });
      git.save(filename, { en: newValue });
    },
    pendingChanges(status) {
      if (typeof status !== 'undefined') {
        pendingChanges = status;
        onChange();
      }
      return pendingChanges;
    },
    dump() {
      return state;
    },
    // forking
    isForkable() {
      return this.loggedIn() && !!state.owner;
    },
    fork() {
      persist(true, onChange);
    },
    // profile methods
    loggedIn() {
      return profile !== null;
    },
    getProfile() {
      return profile;
    },
    getDemos() {
      return API.getDemos(profile.id, profile.token);
    },
    // misc
    version() {
      return state.v;
    },
    git() {
      return git;
    }
  };

  return api;
}
